import onChange from 'on-change';
import i18next from 'i18next';

const doAfterDelay = (functions, delayInSec) => {
  setTimeout(() => {
    functions.forEach((func) => func());
  }, delayInSec * 1000);
};

const toggleSubmitButton = (submitButton, disabled) => {
  submitButton.disabled = disabled;
};

const resetInputValidation = (input) => {
  input.classList.remove('is-invalid', 'is-valid');
};

const toggleInputValidation = (input, isValid) => {
  resetInputValidation(input);

  if (isValid) {
    input.classList.add('is-valid');
  } else {
    input.classList.add('is-invalid');
  }
};

const resetFeedback = (feedbackElement) => {
  feedbackElement.textContent = '';
  feedbackElement.classList.remove('alert-info', 'alert-success', 'alert-danger');
};

const createFeedElement = ({ feed, posts }, state) => {
  const feedContentMarkup = `
    <div class="card-header" id="${feed.id}">
      <h2 class="mb-0">
        <button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse-${feed.id}" aria-expanded="true" aria-controls="collapse-${feed.id}">
          ${feed.title}<span class="badge ml-2"></span>
        </button>
      </h2>
    </div>

    <div id="collapse-${feed.id}" class="collapse" aria-labelledby="${feed.id}" data-parent="#accordion">
      <div id="posts-container" class="card-body">
      </div>
    </div>
  `;

  const feedContainer = document.createElement('div');
  feedContainer.classList.add('card');
  feedContainer.insertAdjacentHTML('afterbegin', feedContentMarkup);

  const postsContainer = feedContainer.querySelector('#posts-container');
  const postsMarkup = posts.map(({ title, link }) => `
    <a class="btn btn-outline-info m-1" href="${link}" target="_blank">${title}</a>
  `);

  postsContainer.insertAdjacentHTML('afterbegin', postsMarkup.join(''));

  const openFeedButton = feedContainer.querySelector('.btn');
  const badge = feedContainer.querySelector('.badge');

  const resetBadge = () => {
    badge.classList.remove('badge-success', 'badge-warning');
    badge.textContent = '';
  };

  if (feed.badge === 'success') {
    badge.classList.add('badge-success');
    badge.textContent = i18next.t('postsUpdated.sucess');
  } else if (feed.badge === 'fail') {
    badge.classList.add('badge-warning');
    badge.textContent = feed.updateError;
  }

  openFeedButton.addEventListener('click', () => {
    resetBadge();

    // Реализация удаления бейджика через state
    const currentFeed = state.feeds.find(({ id }) => id === feed.id);
    const currentFeedIndex = state.feeds.indexOf(currentFeed);
    state.feeds[currentFeedIndex].badge = null;
  });

  return feedContainer;
};

const renderFeeds = (state, { feedsContainer }) => {
  const feeds = state.feeds.map((feed) => {
    const posts = state.posts.filter(({ feedId }) => feedId === feed.id);

    return createFeedElement({ feed, posts }, state);
  });

  feedsContainer.innerHTML = '';

  feeds.forEach((feed) => {
    feedsContainer.appendChild(feed);
  });
};

const renderInputError = (state, { urlInput, feedback }) => {
  const error = state.form.errors[urlInput.name];

  if (!error) {
    feedback.textContent = '';
    feedback.classList.remove('text-danger');

    toggleInputValidation(urlInput, true);

    return;
  }

  feedback.textContent = error.message;
  feedback.classList.add('text-danger');

  toggleInputValidation(urlInput, false);
};

const renderFormElements = (domElements, areElementsDisabled, feedbackClass, feedbackText) => {
  const { urlInput, submitButton, feedback } = domElements;

  toggleSubmitButton(submitButton, areElementsDisabled);
  urlInput.disabled = areElementsDisabled;
  feedback.classList.remove('alert-info', 'alert-success', 'alert-danger');
  feedback.classList.add(feedbackClass);
  feedback.textContent = feedbackText;
};

const renderForm = (state, domElements) => {
  const {
    form, urlInput, feedback, submitButton,
  } = domElements;

  switch (state.form.processState) {
    case 'filling':
      resetFeedback(feedback);
      resetInputValidation(urlInput);
      break;
    case 'sending':
      renderFormElements(domElements, true, 'alert-info', i18next.t('submitFormState.sending'));
      break;
    case 'finished':
      renderFormElements(domElements, false, 'alert-success', i18next.t('submitFormState.finished'));
      renderFeeds(state, domElements);
      doAfterDelay(
        [
          () => form.reset(),
          () => resetInputValidation(urlInput),
          () => resetFeedback(feedback),
          () => toggleSubmitButton(submitButton, true),
        ],
        3,
      );
      break;
    case 'failed':
      renderFormElements(domElements, false, 'alert-danger', state.form.processError);
      doAfterDelay(
        [
          () => resetInputValidation(urlInput),
          () => resetFeedback(feedback),
        ],
        3,
      );
      break;
    default:
      throw new Error(`Unknown state: ${state.form.processState}`);
  }
};

const renderUpdateState = (state, domElements) => {
  const isAnyUpdated = state.feeds.some(({ updated }) => updated === true);
  const isAnyUpdateFailed = state.feeds.some(({ updated }) => updated === 'failed');

  if (isAnyUpdated || isAnyUpdateFailed) {
    renderFeeds(state, domElements);
  }
};

const makeWatchedState = (state, domElements) => {
  const watchedState = onChange(state, (path) => {
    if (path === 'form.errors') {
      renderInputError(watchedState, domElements);
    } else if (path === 'form.valid') {
      toggleSubmitButton(domElements.submitButton, !watchedState.form.valid);
    } else if (path === 'form.processState') {
      renderForm(watchedState, domElements);
    } else if ((/updated$/).test(path)) {
      renderUpdateState(watchedState, domElements);
    }
  });

  return watchedState;
};

export default makeWatchedState;
