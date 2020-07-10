const parse = (response) => {
  const requestUrl = response.config.url;
  const xmlParser = new DOMParser();
  const parsedData = xmlParser.parseFromString(response.data, 'text/xml');

  const title = parsedData.querySelector('channel > title').textContent;
  /* const description = parsedData.querySelector('channel > description').textContent; */
  const posts = [...parsedData.querySelectorAll('item')]
    .map((postNode) => ({
      title: postNode.querySelector('title').textContent,
      link: postNode.querySelector('link').textContent,
    }));

  return {
    title, /* description, */ posts, requestUrl,
  };
};

export default parse;
