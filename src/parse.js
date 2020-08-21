const parse = (rawData) => {
  const xmlParser = new DOMParser();
  const xml = xmlParser.parseFromString(rawData, 'text/xml');
  const title = xml.querySelector('channel > title').textContent;
  const postsData = [...xml.querySelectorAll('item')]
    .map((postNode) => ({
      title: postNode.querySelector('title').textContent,
      link: postNode.querySelector('link').textContent,
    }));

  return { title, postsData };
};

export default parse;
