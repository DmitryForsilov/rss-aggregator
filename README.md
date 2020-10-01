[![Maintainability](https://api.codeclimate.com/v1/badges/3e1e7d6753941fd16810/maintainability)](https://codeclimate.com/github/DmitryForsilov/frontend-project-lvl3/maintainability)
![CI](https://github.com/DmitryForsilov/frontend-project-lvl3/workflows/CI/badge.svg)

# RSS Aggregator
Multiple rss reader.

The project was reviewed by Hexlet.

[Link to deployed project](https://frontend-project-lvl3-drab.vercel.app/)

## Features:
- Adding multiple RSS feeds
- Form input validation
- Form submit validation
- Rendering errors and another messages
- Posts autoupdate (request in every 15 seconds)

## Used in project:
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
