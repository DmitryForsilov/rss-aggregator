class PostsAutoupdater {
  constructor(feedId, requestUrl, checkNewPostsCallback) {
    this._feedId = feedId;
    this._requestUrl = requestUrl;
    this._checkNewPostsCallback = checkNewPostsCallback;
    this.setAutoupdate = this._autoupdate.bind(this);
  }

  _autoupdate(sec) {
    this._checkNewPostsCallback(this);
    setTimeout(this._autoupdate.bind(this), sec * 1000, sec);
  }
}

export default PostsAutoupdater;
