const parse = (response) => {
  const requestUrl = response.config.url;
  const xmlParser = new DOMParser();
  const parsedData = xmlParser.parseFromString(response.data, 'text/xml');

  const title = parsedData.querySelector('channel > title').textContent;
  const postsData = [...parsedData.querySelectorAll('item')]
    .map((postNode) => ({
      title: postNode.querySelector('title').textContent,
      link: postNode.querySelector('link').textContent,
    }));

  return { title, postsData, requestUrl };
};

export default parse;
