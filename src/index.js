import * as yup from 'yup';
import _ from 'lodash';
import i18next from 'i18next';
import axios from 'axios';
import parse from './parse.js';
import makeWatchedState from './makeWatchedState.js';
import 'bootstrap';
import en from './locales/en.js';

const makeUrlWithProxy = (url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com/';
  const normalizeUrl = url.replace(/^https?:\/\//i, '');

  return `${proxy}${normalizeUrl}`;
};

yup.addMethod(yup.string, 'isFeedUnique', function (urls) { // eslint-disable-line func-names
  return this.test(function (value) { // eslint-disable-line func-names
    const { path, createError } = this;
    const isUnique = !urls.some((url) => url === makeUrlWithProxy(value));

    return isUnique ? value : createError({ path, message: i18next.t('errors.feedIsNotUnique') });
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

const domElements = {
  form: document.forms.form,
  urlInput: document.forms.form.elements.url,
  submitButton: document.forms.form.elements.button,
  feedback: document.forms.form.querySelector('.feedback'),
  feedsContainer: document.querySelector('.accordion'),
};

const runApp = async () => {
  await i18next.init({
    lng: 'en',
    debug: true,
    resources: {
      en,
    },
  });

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

  const watchedState = makeWatchedState(state, domElements);

  const formInputHandler = (event) => {
    const field = event.target;

    watchedState.form.processState = 'filling';
    watchedState.form.fields[field.name] = field.value;
    updateValidationState(watchedState);
  };

  const formSubmitHandler = (event) => {
    event.preventDefault();

    watchedState.form.processState = 'sending';
    const urlWithProxy = makeUrlWithProxy(domElements.urlInput.value);

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
          watchedState.form.valid = false;
        }, 1500);
      })
      .catch((error) => {
        if (error.response) {
          watchedState.form.processError = `Network issue: ${error.response.status} ${error.response.statusText} `;
        } else {
          watchedState.form.processError = i18next.t('errors.unsupportedFeedFormat');
        }

        watchedState.form.processState = 'failed';
      });
  };

  domElements.form.addEventListener('input', formInputHandler);
  domElements.form.addEventListener('submit', formSubmitHandler);
};

runApp();
