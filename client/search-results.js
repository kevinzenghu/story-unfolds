
SearchResults = new Mongo.Collection(null, {
    transform (doc) { return window.newTypeSpecificContextBlock(doc) }
  });

var options = {
  keepHistory: 1000 * 60 * 5,
  localSearch: true
};
var fields = ['title', 'keywords', 'authorName', 'authorDisplayUsername'];

StorySearch = new SearchSource('stories', fields, options);
PersonSearch = new SearchSource('people', ['profile.name', 'username'], options);
