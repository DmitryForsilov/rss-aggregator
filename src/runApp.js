import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as yup from 'yup';
import _ from 'lodash';
import i18next from 'i18next';
import axios from 'axios';
import parse from './parse.js';
import initView from './initView.js';
import en from './locales/en.js';

const corsAnywhereProxy = 'https://cors-anywhere.herokuapp.com/';

const makeUrlWithProxy = (proxy, url) => proxy.concat(url.trim());
const makeUrlWithoutProxy = (proxy, url) => url.replace(proxy, '');

const validateForm = (feeds, fields) => {
  const urls = feeds.map(({ requestUrl }) => makeUrlWithoutProxy(corsAnywhereProxy, requestUrl));
  const schema = yup.object().shape({
    url: yup.string().url().notOneOf(urls, `${i18next.t('errors.feedIsNotUnique')}`).required(),
  });

  try {
    schema.validateSync(fields, { abortEarly: false });

    return {};
  } catch (error) {
    return _.keyBy(error.inner, 'path');
  }
};

const processFeedData = (data) => {
  const feedId = _.uniqueId();

  const feed = {
    id: feedId,
    updated: false,
    ...data,
  };

  return feed;
};

const processPostsData = (postsData, feedId) => {
  const posts = postsData.map((data) => ({
    id: _.uniqueId(),
    feedId,
    ...data,
  }));

  return posts;
};

const updateValidationState = (state) => {
  const error = validateForm(state.feeds, state.form.fields);

  if (_.isEqual(error, {})) {
    state.form.valid = true;
    state.form.errors = {};
  } else {
    state.form.valid = false;
    state.form.errors = error;
  }
};

const updateFeedsState = (state, feed) => {
  state.feeds.push(feed);
};

const updatePostsState = (state, posts) => {
  state.posts = [...state.posts, ...posts];
};

const checkNewPosts = (state, feed, updateIntervalInSec) => {
  axios.get(feed.requestUrl)
    .then((response) => {
      const { postsData } = parse(response.data);
      const posts = processPostsData(postsData, feed.id);
      const currentPosts = state.posts.filter((post) => post.feedId === feed.id);
      const newPosts = _.differenceBy(posts, currentPosts, 'title');

      if (newPosts.length > 0) {
        feed.updated = true;

        updatePostsState(state, newPosts);
      }
    })
    .catch((error) => {
      feed.updated = 'failed';

      console.log(error);
    })
    .finally(() => {
      feed.updated = false;

      setTimeout(() => checkNewPosts(state, feed, updateIntervalInSec), updateIntervalInSec * 1000);
    });
};

const setAutoupdate = (state, feed, updateIntervalInSec) => {
  setTimeout(() => checkNewPosts(state, feed, updateIntervalInSec), updateIntervalInSec * 1000);
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
      processState: null,
      fields: {
        url: '',
      },
      valid: false,
      errors: {},
    },
    feeds: [],
    posts: [],
  };

  const domElements = {
    form: document.forms.form,
    urlInput: document.forms.form.elements.url,
    submitButton: document.forms.form.elements.button,
    feedback: document.forms.form.querySelector('.feedback'),
    feedsContainer: document.querySelector('.accordion'),
  };
  const watchedState = initView(state, domElements);

  const formInputHandler = (event) => {
    const field = event.target;

    watchedState.form.processState = 'filling';
    watchedState.form.fields[field.name] = field.value.trim();

    updateValidationState(watchedState);
  };

  const formSubmitHandler = (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    watchedState.form.processState = 'sending';
    const urlWithProxy = makeUrlWithProxy(corsAnywhereProxy, formData.get('url'));

    axios.get(urlWithProxy)
      .then((response) => {
        const requestUrl = response.config.url;
        const { title, postsData } = parse(response.data);
        const feed = processFeedData({ title, requestUrl });
        const posts = processPostsData(postsData, feed.id);
        const updateIntervalInSec = 5;

        updateFeedsState(watchedState, feed);
        updatePostsState(watchedState, posts);
        setAutoupdate(watchedState, feed, updateIntervalInSec);

        watchedState.form.processState = 'finished';
        watchedState.form.valid = false;
      })
      .catch((error) => {
        watchedState.form.processState = 'failed';

        console.log(error);
      });
  };

  domElements.form.addEventListener('input', formInputHandler);
  domElements.form.addEventListener('submit', formSubmitHandler);
};

export default runApp;
