const parse = (data) => {
  const xmlParser = new DOMParser();
  const parsedData = xmlParser.parseFromString(data, 'text/xml');

  return parsedData;
};

export default parse;
