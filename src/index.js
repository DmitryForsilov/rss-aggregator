import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as yup from 'yup';
import _ from 'lodash';
import i18next from 'i18next';
import axios from 'axios';
import { PROXY, AUTOUPDATE_INTERVAL_IN_SEC } from './constants.js';
import parse from './parse.js';
import makeWatchedState from './makeWatchedState.js';
import en from './locales/en.js';

const makeUrlWithProxy = (proxy, url) => proxy.concat(url.trim());
const makeUrlWithoutProxy = (proxy, url) => url.replace(proxy, '');

const validateForm = (state) => {
  const urls = state.feeds.map(({ requestUrl }) => makeUrlWithoutProxy(PROXY, requestUrl));
  const schema = yup.object().shape({
    url: yup.string().url().notOneOf(urls, `${i18next.t('errors.feedIsNotUnique')}`).required(),
  });

  try {
    schema.validateSync(state.form.fields, { abortEarly: false });

    return {};
  } catch (error) {
    return _.keyBy(error.inner, 'path');
  }
};

const getFeedData = (parsedData) => {
  const title = parsedData.querySelector('channel > title').textContent;
  const postsData = [...parsedData.querySelectorAll('item')]
    .map((postNode) => ({
      title: postNode.querySelector('title').textContent,
      link: postNode.querySelector('link').textContent,
    }));

  return { title, postsData };
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
  const error = validateForm(state);

  if (_.isEqual(error, {})) {
    state.form.valid = true;
    state.form.errors = {};
  } else {
    state.form.valid = false;
    state.form.errors = error;
  }
};

const updateFeedsState = (state, feed) => {
  state.feeds = [...state.feeds, feed];
};

const updatePostsState = (state, posts) => {
  state.posts = [...state.posts, ...posts];
};

const setAutoupdate = (state, feed, autoupdateInterval) => {
  const checkNewPosts = () => {
    axios({
      method: 'get',
      url: feed.requestUrl,
    })
      .then((response) => {
        const parsedData = parse(response.data);
        const { postsData } = getFeedData(parsedData);
        const posts = processPostsData(postsData, feed.id);
        const currentPosts = state.posts.filter((post) => post.feedId === feed.id);
        const newPosts = _.differenceBy(posts, currentPosts, 'title');

        if (newPosts.length > 0) {
          feed.updated = true;

          updatePostsState(state, newPosts);
        }
      })
      .catch((error) => {
        if (error.response) {
          feed.updated = 'failedNetworkIssue';
        } else {
          feed.updated = 'failedUnknownIssue';
        }

        console.log(error);
      })
      .finally(() => {
        feed.updated = false;
      });

    setTimeout(() => checkNewPosts(), autoupdateInterval * 1000);
  };

  setTimeout(() => checkNewPosts(), autoupdateInterval * 1000);
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
  const watchedState = makeWatchedState(state, domElements);

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
    const urlWithProxy = makeUrlWithProxy(PROXY, formData.get('url'));

    axios({
      method: 'get',
      url: urlWithProxy,
    })
      .then((response) => {
        const requestUrl = response.config.url;
        const parsedData = parse(response.data);
        const { title, postsData } = getFeedData(parsedData);
        const feed = processFeedData({ title, requestUrl });
        const posts = processPostsData(postsData, feed.id);

        updateFeedsState(watchedState, feed);
        updatePostsState(watchedState, posts);
        setAutoupdate(watchedState, feed, AUTOUPDATE_INTERVAL_IN_SEC);

        watchedState.form.processState = 'finished';
        watchedState.form.valid = false;
      })
      .catch((error) => {
        if (error.response) {
          watchedState.form.processState = 'failedNetworkIssue';
        } else {
          watchedState.form.processState = 'failedUnknownIssue';
        }

        console.log(error);
      });
  };

  domElements.form.addEventListener('input', formInputHandler);
  domElements.form.addEventListener('submit', formSubmitHandler);
};

runApp();
