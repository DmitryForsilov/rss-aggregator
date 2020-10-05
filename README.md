[![Maintainability](https://api.codeclimate.com/v1/badges/9e9ed9f41894811df0bb/maintainability)](https://codeclimate.com/github/DmitryForsilov/rss-aggregator/maintainability)
![CI](https://github.com/DmitryForsilov/rss-aggregator/workflows/CI/badge.svg)

# RSS Aggregator
Multiple rss reader.

This project was reviewed by Hexlet.

[Link to deployed project](https://rss-aggregator-df.vercel.app/)

## Features:
- Adding multiple RSS feeds
- Form input validation
- Form submit validation
- Rendering errors and another messages
- Posts autoupdate (request in every 15 seconds)

## Used in project:
- **MVC**
- **bootstrap**
- **lodash**
- **yup**
- **i18next**
- **axios**
- **on-change**
- **webpack**
- **es lint**
- **vercel** - deploy

## Examples of RSS URLs you can use:
```
http://lorem-rss.herokuapp.com/feed (updates once a minute)
http://lorem-rss.herokuapp.com/feed?unit=second&interval=30 (update every 30 seconds)
http://lorem-rss.herokuapp.com/feed?unit=second&interval=15 (update every 15 seconds)
https://developer.mozilla.org/ru/docs/feeds/rss/all
https://css-tricks.com/feed/
https://www.habrahabr.ru/rss/main
```
