import onChange from 'on-change';
import * as yup from 'yup';
import _ from 'lodash';
import axios from 'axios';

const schema = yup.object().shape({
  url: yup.string().required().url(),
  // сделать валидацию на дубли
});

const messages = {
  submitFormState: {
    sending: 'Please, wait...',
    finished: 'Rss feed loaded successfully!',
    failed: 'Connection problems. Please, try again.',
  },
};

const validateForm = (fields) => {
  try {
    schema.validateSync(fields, { abortEarly: false });

    return {};
  } catch (error) {
    return _.keyBy(error.inner, 'path');
  }
};

const updateValidationState = (state) => {
  const errors = validateForm(state.form.fields);

  if (_.isEqual(errors, {})) {
    state.form.valid = true;
    state.form.errors = {};
  } else {
    state.form.valid = false;
    state.form.errors = errors;
  }
};

const renderInputError = (errors, input, feedbackElement) => {
  const error = errors[input.name];

  if (!error) {
    feedbackElement.textContent = '';
    feedbackElement.classList.remove('text-danger');
    input.classList.remove('is-invalid');

    return;
  }

  input.classList.add('is-invalid');
  feedbackElement.classList.add('text-danger');
  feedbackElement.textContent = error.message;
};

const renderSubmitFormState = (processState, formElements, feedbackElement) => {
  switch (processState) {
    case 'filling':
      feedbackElement.textContent = '';
      feedbackElement.classList.remove('alert-info', 'alert-success', 'alert-danger');
      break;
    case 'sending':
      formElements.button.disabled = true;
      formElements.url.disabled = true;
      feedbackElement.classList.add('alert-info');
      feedbackElement.textContent = messages.submitFormState.sending;
      break;
    case 'finished':
      formElements.button.disabled = false;
      formElements.url.disabled = false;
      feedbackElement.classList.add('alert-success');
      feedbackElement.textContent = messages.submitFormState.finished;
      break;
    case 'failed':
      formElements.button.disabled = false;
      formElements.url.disabled = false;
      feedbackElement.classList.add('alert-danger');
      feedbackElement.textContent = messages.submitFormState.failed;
      break;
    default:
      throw new Error(`Unknown state: ${processState}`);
  }
};

const runApp = () => {
  const state = {
    form: {
      processState: 'filling',
      fields: {
        url: '',
      },
      valid: false,
      errors: {},
    },
  };

  const proxy = 'https://cors-anywhere.herokuapp.com/';
  const xmlParser = new DOMParser();

  const { form } = document.forms;
  const formElements = {
    url: form.elements.url,
    button: form.elements.button,
  };
  const feedbackElement = document.querySelector('.feedback');

  const watchedState = onChange(state, (path) => {
    if (path === 'form.errors') {
      renderInputError(watchedState.form.errors, formElements.url, feedbackElement);
    } else if (path === 'form.valid') {
      formElements.button.disabled = !watchedState.form.valid;
    } else if (path === 'form.processState') {
      renderSubmitFormState(watchedState.form.processState, formElements, feedbackElement);
    }
  });

  const formInputHandler = (event) => {
    const field = event.target;

    watchedState.form.processState = 'filling';
    watchedState.form.fields[field.name] = field.value;
    updateValidationState(watchedState);
  };

  const formSubmitHandler = (event) => {
    event.preventDefault();

    watchedState.form.processState = 'sending';

    const url = formElements.url.value.replace(/^https?:\/\//i, '');

    axios({
      method: 'get',
      url: `${proxy}${url}`,
    })
      .then(({ data }) => {
        const parsedData = xmlParser.parseFromString(data, 'text/xml');

        /* console.log(parsedData); */
        /* console.log(parsedData.querySelector('channel > title').textContent); */
        const feedTitle = parsedData.querySelector('channel > title').textContent;
        const feedDescription = parsedData.querySelector('channel > description').textContent;
        const feedPosts = [...parsedData.querySelectorAll('item')]
          .map((postNode) => ({
            title: postNode.querySelector('title').textContent,
            link: postNode.querySelector('link').textContent,
          }));
        console.log(feedTitle);
        console.log(feedDescription);
        console.log(feedPosts);

        watchedState.form.processState = 'finished';

        setTimeout(() => {
          watchedState.form.processState = 'filling';
          form.reset();
          watchedState.form.valid = false;
        }, 2000);
      })
      .catch((error) => {
        watchedState.form.processState = 'failed';
        console.log(error);
      });
  };

  form.addEventListener('input', formInputHandler);
  form.addEventListener('submit', formSubmitHandler);
};

runApp();
