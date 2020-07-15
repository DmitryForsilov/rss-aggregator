import * as yup from 'yup';
import _ from 'lodash';
import i18next from 'i18next';
import axios from 'axios';
import parse from './parse.js';
import makeWatchedState from './makeWatchedState.js';
import 'bootstrap';
import en from './locales/en.js';
import PostsAutoupdater from './PostsAutoupdater.js';

const makeUrlWithProxy = (url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com/';
  const normalizeUrl = url.trim().replace(/^https?:\/\//i, '');

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
    updated: false,
    updateError: null,
    badge: null,
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

const checkNewPostsCallback = (state) => (postsAutoupdater) => {
  const currentFeed = state.feeds.find(({ id }) => id === postsAutoupdater._feedId);
  const currentFeedIndex = state.feeds.indexOf(currentFeed);

  state.feeds[currentFeedIndex].updated = false;

  axios({
    method: 'get',
    url: postsAutoupdater._requestUrl,
  })
    .then((response) => {
      const { postsData } = parse(response);
      const posts = processPostsData(postsData, postsAutoupdater._feedId);
      const currentPosts = state.posts.filter((post) => post.feedId === postsAutoupdater._feedId);
      const newPosts = _.differenceBy(posts, currentPosts, 'title');

      if (newPosts.length > 0) {
        updatePostsState(state, newPosts);

        state.feeds[currentFeedIndex].badge = 'success';
        state.feeds[currentFeedIndex].updated = true;
      }
    })
    .catch((error) => {
      state.feeds[currentFeedIndex].badge = 'fail';
      state.feeds[currentFeedIndex].updated = 'failed';

      if (error.response) {
        state.feeds[currentFeedIndex].updateError = i18next.t('postsUpdated.fail', { issue: `${error.response.status} ${error.response.statusText}` });
      } else {
        state.feeds[currentFeedIndex].updateError = i18next.t('postsUpdated.fail', { issue: 'Unknown issue.' });
      }
    });
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
    watchedState.form.fields[field.name] = field.value.trim();
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
        const { title, postsData, requestUrl } = parse(response);
        const feed = processFeedData({ title, requestUrl });
        const posts = processPostsData(postsData, feed.id);

        updateFeedsState(watchedState, feed);
        updatePostsState(watchedState, posts);

        const intervalInSeconds = 5;
        const postsAutoupdater = new PostsAutoupdater(
          feed.id, urlWithProxy, checkNewPostsCallback(watchedState),
        );
        postsAutoupdater.setAutoupdate(intervalInSeconds);

        watchedState.form.processState = 'finished';
        watchedState.form.valid = false;
      })
      .catch((error) => {
        if (error.response) {
          watchedState.form.processError = i18next.t('errors.networkIssue', { errorStatus: error.response.status, errorText: error.response.statusText });
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
