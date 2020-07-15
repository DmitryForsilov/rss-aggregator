![CI](https://github.com/DmitryForsilov/frontend-project-lvl3/workflows/CI/badge.svg)
[![Maintainability](https://api.codeclimate.com/v1/badges/3e1e7d6753941fd16810/maintainability)](https://codeclimate.com/github/DmitryForsilov/frontend-project-lvl3/maintainability)

# frontend-project-lvl3

## RSS Aggregator

[Link to deployed project](https://frontend-project-lvl3-drab.vercel.app/)

### Features:
- Adding multiple RSS feeds
- Form input validation
- Form submit validation
- Rendering errors and another messages
- Posts autoupdate (request in every 5 seconds)

### Used in project:
- **MVC**
- **HTML**
- **JavaScript**
- **es lint** for code style
- **bootstrap** components
- **lodash** functions
- **yup** for validation
- **i18next** for text use
- **axios** for AJAX-requests
- **on-change** for state watching
- assembly via **webpack**
- CI via **github actions**
- deploy on **vercel**

### Examples of RSS URLs you can use:
```
http://lorem-rss.herokuapp.com/feed (updates once a minute)
http://lorem-rss.herokuapp.com/feed?unit=second&interval=30 (update every 30 seconds)
https://developer.mozilla.org/ru/docs/feeds/rss/all
https://css-tricks.com/feed/
https://www.habrahabr.ru/rss/main
```
