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
      case 'failed':
        badgeElement.classList.add('badge-warning');
        badgeElement.textContent = i18next.t('postsUpdated.failed');
        break;
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
    case 'failed':
      renderFormElements(domElements, false, 'alert-danger', i18next.t('submitFormState.failed'));
      doAfterDelay(
        [
          () => resetInputValidation(urlInput),
          () => resetFeedback(feedback),
        ],
        3,
      );
      break;
    default:
      throw new Error(`Unknown processState: ${processState}`);
  }
};

const initView = (state, domElements) => {
  const mapping = {
    'form.errors': () => renderInputError(state.form.errors, domElements),
    'form.valid': () => toggleSubmitButton(domElements.submitButton, !state.form.valid),
    'form.processState': () => renderForm(state.form.processState, domElements),
    feeds: ({ value, previousValue }) => {
      const feedToRender = _.differenceBy(value, previousValue, 'id')[0];
      const noFeedsRenderedBefore = previousValue.length === 0;

      renderFeed(domElements.feedsContainer, feedToRender, noFeedsRenderedBefore);
    },
    posts: ({ value, previousValue }) => {
      const postsToRender = _.differenceWith(value, previousValue, _.isEqual);
      const postsGroupedByFeedId = _.groupBy(postsToRender, 'feedId');
      const feedsIds = Object.keys(postsGroupedByFeedId);
      const feedsToRenderBadges = state.feeds.filter(({ id }) => feedsIds.includes(id));

      renderPosts(postsGroupedByFeedId, domElements.feedsContainer);
      renderUpdateBadges(feedsToRenderBadges, domElements.feedsContainer);
    },
  };

  const watchedState = onChange(state, (path, value, previousValue) => {
    if (mapping[path]) {
      mapping[path]({ value, previousValue });
    }
  });

  return watchedState;
};

export default initView;
