import onChange from 'on-change';
import i18next from 'i18next';

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

  submitButton.disabled = areElementsDisabled;
  urlInput.disabled = areElementsDisabled;
  feedback.classList.remove('alert-info', 'alert-success', 'alert-danger');
  feedback.classList.add(feedbackClass);
  feedback.textContent = feedbackText;
};

const renderSubmitFormState = (state, domElements) => {
  const { form, urlInput, feedback } = domElements;

  switch (state.form.processState) {
    case 'filling':
      feedback.textContent = '';
      feedback.classList.remove('alert-info', 'alert-success', 'alert-danger');

      resetInputValidation(urlInput);
      break;
    case 'sending':
      renderFormElements(domElements, true, 'alert-info', i18next.t('submitFormState.sending'));
      break;
    case 'finished':
      renderFormElements(domElements, false, 'alert-success', i18next.t('submitFormState.finished'));
      form.reset();
      break;
    case 'failed':
      renderFormElements(domElements, false, 'alert-danger', state.form.processError);
      resetInputValidation(urlInput);
      break;
    default:
      throw new Error(`Unknown state: ${state.form.processState}`);
  }
};

const createFeedElement = ({ feed, posts }) => {
  const feedContentMarkup = `
    <div class="card-header" id="${feed.id}">
      <h2 class="mb-0">
        <button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse-${feed.id}" aria-expanded="true" aria-controls="collapse-${feed.id}">
          ${feed.title}
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

  return feedContainer;
};

const renderFeeds = (feeds, { feedsContainer }) => {
  feedsContainer.innerHTML = '';

  feeds.forEach((feed) => {
    feedsContainer.appendChild(feed);
  });
};

const makeWatchedState = (state, domElements) => {
  const watchedState = onChange(state, (path) => {
    if (path === 'form.errors') {
      renderInputError(watchedState, domElements);
    } else if (path === 'form.valid') {
      domElements.submitButton.disabled = !watchedState.form.valid;
    } else if (path === 'form.processState') {
      renderSubmitFormState(watchedState, domElements);
    } else if (path === 'feeds') {
      const feeds = state.feeds.map((feed) => {
        const posts = state.posts.filter(({ feedId }) => feedId === feed.id);

        return createFeedElement({ feed, posts });
      });

      renderFeeds(feeds, domElements);
    }
  });

  return watchedState;
};

export default makeWatchedState;
