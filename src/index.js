import * as yup from 'yup';
import _ from 'lodash';
import axios from 'axios';
import parse from './parse.js';
import makeWatchedState from './makeWatchedState.js';
import 'bootstrap';

const makeUrlWithProxy = (url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com/';
  const normalizeUrl = url.replace(/^https?:\/\//i, '');

  return `${proxy}${normalizeUrl}`;
};

const messages = {
  submitFormState: {
    sending: 'Please, wait...',
    finished: 'Rss feed loaded successfully!',
    /* failed: 'Connection problems. Please, try again.', */
  },
  errors: {
    unsupportedFeedFormat: 'Unsupported feed format.',
    feedIsNotUnique: 'This feed is already exist',
  },
};

// eslint-disable-next-line func-names
yup.addMethod(yup.string, 'isFeedUnique', function (urls) {
  // eslint-disable-next-line func-names
  return this.test(function (value) {
    const { path, createError } = this;
    const isUnique = !urls.some((url) => url === makeUrlWithProxy(value));

    return isUnique ? value : createError({ path, message: messages.errors.feedIsNotUnique });
  });
});

const validateForm = (state) => {
  const urls = state.feeds.map(({ requestUrl }) => requestUrl);

  const schema = yup.object().shape({
    url: yup.string().url().isFeedUnique(urls).required(),
  });

  try {
    schema.validateSync(state.form.fields, { abortEarly: false });

    return {};
  } catch (error) {
    return _.keyBy(error.inner, 'path');
  }
};

const processFeedData = (data) => {
  const feedId = _.uniqueId();

  const feed = {
    id: feedId,
    requestUrl: data.requestUrl,
    title: data.title,
    /* description: data.description, */
  };

  const posts = data.posts.map((post) => ({
    id: _.uniqueId(),
    feedId,
    title: post.title,
    link: post.link,
  }));

  return { feed, posts };
};

const updateValidationState = (state) => {
  const error = validateForm(state);

  if (_.isEqual(error, {})) {
    state.form.valid = true;
    state.form.errors = {};
  } else {
    state.form.valid = false;
    state.form.errors = error;
  }
};

const updateFeedsState = (state, feedData) => {
  // завязано на порядок добавления. Исправить?
  state.posts = [...state.posts, ...feedData.posts];
  state.feeds = [...state.feeds, feedData.feed];
};

const runApp = () => {
  const state = {
    form: {
      processState: 'filling',
      processError: null,
      fields: {
        url: '',
      },
      valid: false,
      errors: {},
    },
    feeds: [],
    posts: [],
  };

  const { form } = document.forms;
  const formElements = {
    url: form.elements.url,
    button: form.elements.button,
    feedback: form.querySelector('.feedback'),
  };
  const feedsContainer = document.querySelector('.accordion');

  const watchedState = makeWatchedState(state, formElements, feedsContainer, messages);

  const formInputHandler = (event) => {
    const field = event.target;

    watchedState.form.processState = 'filling';
    watchedState.form.fields[field.name] = field.value;
    updateValidationState(watchedState);
  };

  const formSubmitHandler = (event) => {
    event.preventDefault();

    watchedState.form.processState = 'sending';
    const urlWithProxy = makeUrlWithProxy(formElements.url.value);

    axios({
      method: 'get',
      url: urlWithProxy,
    })
      .then((response) => {
        const parsedData = parse(response);
        const feedData = processFeedData(parsedData);

        updateFeedsState(watchedState, feedData);

        watchedState.form.processState = 'finished';

        setTimeout(() => {
          watchedState.form.processState = 'filling';
          form.reset();
          watchedState.form.valid = false;
        }, 1500);
      })
      .catch((error) => {
        if (error.response) {
          watchedState.form.processError = `Network issue: ${error.response.status} ${error.response.statusText} `;
        } else {
          watchedState.form.processError = messages.errors.unsupportedFeedFormat;
        }

        watchedState.form.processState = 'failed';
      });
  };

  form.addEventListener('input', formInputHandler);
  form.addEventListener('submit', formSubmitHandler);
};

runApp();
