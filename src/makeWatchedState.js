import onChange from 'on-change';

const renderInputError = (state, formElements) => {
  const error = state.form.errors[formElements.url.name];

  if (!error) {
    formElements.feedback.textContent = '';
    formElements.feedback.classList.remove('text-danger');
    formElements.url.classList.remove('is-invalid');
    formElements.url.classList.add('is-valid');

    return;
  }

  formElements.feedback.textContent = error.message;
  formElements.feedback.classList.add('text-danger');
  formElements.url.classList.remove('is-valid');
  formElements.url.classList.add('is-invalid');
};

const renderSubmitFormState = (state, formElements, messages) => {
  switch (state.form.processState) {
    case 'filling':
      formElements.feedback.textContent = '';
      formElements.feedback.classList.remove('alert-info', 'alert-success', 'alert-danger');
      formElements.url.classList.remove('is-valid');
      break;
    case 'sending':
      formElements.button.disabled = true;
      formElements.url.disabled = true;
      formElements.feedback.classList.remove('alert-success', 'alert-danger');
      formElements.feedback.classList.add('alert-info');
      formElements.feedback.textContent = messages.submitFormState.sending;
      break;
    case 'finished':
      formElements.button.disabled = false;
      formElements.url.disabled = false;
      formElements.feedback.classList.remove('alert-info', 'alert-danger');
      formElements.feedback.classList.add('alert-success');
      formElements.feedback.textContent = messages.submitFormState.finished;
      break;
    case 'failed':
      formElements.button.disabled = false;
      formElements.url.disabled = false;
      formElements.feedback.classList.remove('alert-info', 'alert-success');
      formElements.feedback.classList.add('alert-danger');
      formElements.feedback.textContent = state.form.processError;
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

const renderFeeds = (feeds, feedsContainer) => {
  feedsContainer.innerHTML = '';

  feeds.forEach((feed) => {
    feedsContainer.appendChild(feed);
  });
};

const makeWatchedState = (state, formElements, feedsContainer, messages) => {
  const watchedState = onChange(state, (path) => {
    if (path === 'form.errors') {
      renderInputError(watchedState, formElements);
    } else if (path === 'form.valid') {
      formElements.button.disabled = !watchedState.form.valid;
    } else if (path === 'form.processState') {
      renderSubmitFormState(
        watchedState, formElements, messages,
      );
    } else if (path === 'feeds') {
      const feeds = state.feeds.map((feed) => {
        const posts = state.posts.filter(({ feedId }) => feedId === feed.id);

        return createFeedElement({ feed, posts });
      });

      renderFeeds(feeds, feedsContainer);
    }
  });

  return watchedState;
};

export default makeWatchedState;
