import onChange from 'on-change';
import i18next from 'i18next';
import _ from 'lodash';

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

const createFeedElement = (feedData) => {
  const feedContentMarkup = `
    <div class="card-header" id="${feedData.id}">
      <h2 class="mb-0">
        <button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse-${feedData.id}" aria-expanded="true" aria-controls="collapse-${feedData.id}">
          ${feedData.title}<span id="update-badge-${feedData.id}" class="badge ml-2"></span>
        </button>
      </h2>
    </div>

    <div id="collapse-${feedData.id}" class="collapse" aria-labelledby="${feedData.id}" data-parent="#accordion">
      <div id="posts-container-${feedData.id}" class="card-body">
      </div>
    </div>
  `;

  const feedContainer = document.createElement('div');
  feedContainer.classList.add('card');
  feedContainer.insertAdjacentHTML('afterbegin', feedContentMarkup);

  const openFeedButton = feedContainer.querySelector('.btn');
  const badge = feedContainer.querySelector('.badge');

  const resetBadge = (badgeElement) => {
    badgeElement.classList.remove('badge-success', 'badge-warning');
    badgeElement.textContent = '';
  };

  openFeedButton.addEventListener('click', () => resetBadge(badge));

  return feedContainer;
};

const renderFeed = (feedsContainer, feedToRender, noFeedsRenderedBefore) => {
  if (noFeedsRenderedBefore) {
    feedsContainer.innerHTML = '';
  }

  const feedElement = createFeedElement(feedToRender);

  feedsContainer.appendChild(feedElement);
};

const renderPosts = (postsGroupedByFeedId, feedsContainer) => {
  Object.entries(postsGroupedByFeedId).forEach(([feedId, posts]) => {
    const postsContainer = feedsContainer.querySelector(`#posts-container-${feedId}`);
    const postsMarkup = posts.map(({ title, link }) => `
      <a class="btn btn-outline-info m-1" href="${link}" target="_blank">${title}</a>
    `).join('');

    postsContainer.insertAdjacentHTML('afterbegin', postsMarkup);
  });
};

const renderUpdateBadges = (feedsToRenderBadges, feedsContainer) => {
  feedsToRenderBadges.forEach(({ id, updated }) => {
    const badgeElement = feedsContainer.querySelector(`#update-badge-${id}`);

    switch (updated) {
      case false:
        break;
      case true:
        badgeElement.classList.add('badge-success');
        badgeElement.textContent = i18next.t('postsUpdated.sucess');
        break;
      case 'failedNetworkIssue':
      case 'failedUnknownIssue': {
        const errorMessage = updated === 'failedNetworkIssue'
          ? i18next.t('postsUpdated.networkIssue')
          : i18next.t('postsUpdated.unknownIssue');

        badgeElement.classList.add('badge-warning');
        badgeElement.textContent = errorMessage;
        break;
      }
      default:
        throw new Error(`Unknown updated state: ${updated}`);
    }
  });
};

const renderInputError = (errors, { urlInput, feedback }) => {
  const error = errors[urlInput.name];

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

const renderForm = (processState, domElements) => {
  const {
    form, urlInput, feedback, submitButton,
  } = domElements;

  switch (processState) {
    case null:
      break;
    case 'filling':
      resetFeedback(feedback);
      resetInputValidation(urlInput);
      break;
    case 'sending':
      renderFormElements(domElements, true, 'alert-info', i18next.t('submitFormState.sending'));
      break;
    case 'finished':
      renderFormElements(domElements, false, 'alert-success', i18next.t('submitFormState.finished'));
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
    case 'failedNetworkIssue':
    case 'failedUnknownIssue':
    {
      const errorMessage = processState === 'failedNetworkIssue'
        ? i18next.t('submitFormState.networkIssue')
        : i18next.t('submitFormState.unknownIssue');

      renderFormElements(domElements, false, 'alert-danger', errorMessage);
      doAfterDelay(
        [
          () => resetInputValidation(urlInput),
          () => resetFeedback(feedback),
        ],
        3,
      );
      break;
    }
    default:
      throw new Error(`Unknown processState: ${processState}`);
  }
};

const makeWatchedState = (state, domElements) => {
  const watchedState = onChange(state, (path, value, previousValue) => {
    if (path === 'form.errors') {
      renderInputError(watchedState.form.errors, domElements);
    } else if (path === 'form.valid') {
      toggleSubmitButton(domElements.submitButton, !watchedState.form.valid);
    } else if (path === 'form.processState') {
      renderForm(watchedState.form.processState, domElements);
    } else if (path === 'feeds') {
      const feedToRender = _.differenceBy(value, previousValue, 'id')[0];
      const noFeedsRenderedBefore = previousValue.length === 0;

      renderFeed(domElements.feedsContainer, feedToRender, noFeedsRenderedBefore);
    } else if (path === 'posts') {
      const postsToRender = _.differenceWith(value, previousValue, _.isEqual);
      const postsGroupedByFeedId = _.groupBy(postsToRender, 'feedId');
      const feedsIds = Object.keys(postsGroupedByFeedId);
      const feedsToRenderBadges = state.feeds.filter(({ id }) => feedsIds.includes(id));

      renderPosts(postsGroupedByFeedId, domElements.feedsContainer);
      renderUpdateBadges(feedsToRenderBadges, domElements.feedsContainer);
    }
  });

  return watchedState;
};

export default makeWatchedState;
