import { Meteor } from 'meteor/meteor';
import { Stories } from '../stories.js';

Stories._ensureIndex({
  shortId: 1
}, {
  unique: 1
});

Stories._ensureIndex({
  published: 1
});

Stories._ensureIndex({
  deleted: 1
});

Stories._ensureIndex({
  authorId: 1
});


const readStoryFields = {
  draftStory: 0,
  history: 0,
  narrativeRightsReserved: 0,
  //savedAt: 0, // used in analytics
  //createdAt:0, // used in analytics
  everPublished:0,
  //analyticsBeforeReads:0, // need this to calculate read percentage TODO be more specific & ideally don't send to everyone
  //deleted: 0, // currently always blank so no need to filter
  //deletedAt: 0, // currently always blank so no need to filter
  //'analytics.shares': 0,
  //'contextBlocks.authorId': 0, // used in analytics
  //'contextBlocks.storyShortId': 0, // used in analytics
  'contextBlocks.storyId': 0,
  'contextBlocks.version': 0,
  'contextBlocks.savedAt': 0,
  'contextBlocks.publishedAt': 0,
  'contextBlocks.createdAt': 0,
  'contextBlocks.fullDetails': 0,
  'contextBlocks.published': 0,
  'contextBlocks.everPublished': 0,
  'contextBlocks.searchQuery': 0,
  'contextBlocks.searchOption': 0
};


const previewStoryFields = {
  shortId: 1,
  savedAt: 1,
  r: 1,
  publishedAt: 1,
  published: 1,
  userPathSegment: 1,
  authorId: 1,
  authorName: 1,
  //authorUsername: 1, // don't need atm. can get from lowercasing the below
  authorDisplayUsername: 1,
  //favorited: 1, // will need to add this back in for non-curated stories to use preview
  editorsPick: 1,
  editorsPickAt: 1,
  //'analytics.views': 1,  // will need to add this back in for non-curated stories to use preview
  contextBlockTypeCount: 1,
  narrativeBlockCount: 1,
  headerImageFormat: 1,
  headerImage: 1,
  favoritedTotal: 1,
  storyPathSegment: 1,
  title: 1,
  keywords: 1
};


// add preview fields again but nested under draftStory. also authorUsername until migrate
const previewStoryFieldsWithDraft = _.extend({}, previewStoryFields, _.chain(previewStoryFields).keys().map(function(fieldName){return 'draftStory.' + fieldName}).object(_.values(previewStoryFields)).value(), {'authorUsername': 1});

Meteor.publish("curatedStoriesPub", function(options) {
  options = options ? options : {};
  _.defaults(options, {page: 0});

  return Stories.find({
    published: true,
    editorsPick: true
  }, {
    fields: options.preview ? previewStoryFields : readStoryFields,
    skip: options.page * PUB_SIZE,
    sort: {
      editorsPickAt: -1
    },
    limit: PUB_SIZE
  });
});

var doOnlyCurated = function(options){
  return Stories.find({
    published: true,
    editorsPick: true
  }, {
    fields: options.preview ? previewStoryFields : readStoryFields,
    skip: options.page * PUB_SIZE,
    sort: {
      editorsPickAt: -1
    },
    limit: PUB_SIZE
  });
};

Meteor.publish("curatedAndUserFollowingStoriesPub", function(options) {
  options = options ? options : {};
  _.defaults(options, {page: 0});


  if(!this.userId){
    return doOnlyCurated(options);
  } else {
    var user = Meteor.users.findOne(this.userId, {
      fields: {
        "profile.following" : 1
      }
    });

    var userFollowing = user.profile.following || [];

    if(!userFollowing || !userFollowing.length){
      return doOnlyCurated(options)
    }
  }

  // if user is following people, then return the follows and the curated
  return Stories.find({
    published: true,
    $or:[
      {authorId: {$in: _.sortBy(userFollowing, _.identity)}},
      {editorsPick: true}
    ]
  }, {
    fields: options.preview ? previewStoryFields : readStoryFields,
    skip: options.page * PUB_SIZE,
    sort: {
      r: -1
    },
    limit: PUB_SIZE
  });

});

Meteor.publish("mixedStoriesPub", function(options) { // curated and specific authors
  options = options ? options : {};
  _.defaults(options, {page: 0, authors: []});

  if(!this.userId){
    return this.ready();
  }

  return Stories.find({
    published: true,
    $or:[
      {authorId: {$in: _.sortBy(options.authors, _.identity)}},
      {editorsPick: true}
    ]
  }, {
    fields: options.preview ? previewStoryFields : readStoryFields,
    skip: options.page * PUB_SIZE,
    sort: {
      r: -1
    },
    limit: PUB_SIZE
  });
});

Meteor.publish("newestStoriesPub", function(options) { // for now, it's just publishedAt (later should maybe be firstPublishedAt)
  options = options ? options : {};
  _.defaults(options, {page: 0});
  return Stories.find({
    published: true
  }, {
    fields: options.preview ? previewStoryFields : readStoryFields,
    skip: options.page * PUB_SIZE,
    sort: {
      publishedAt: -1
    },
    limit: PUB_SIZE
  });
});

Meteor.publish("trendingStoriesPub", function(options) { // for now, it's just the most views
  options = options ? options : {};
  _.defaults(options, {page: 0});
  return Stories.find({
    published: true
  }, {
    fields: options.preview ? previewStoryFields : readStoryFields,
    skip: options.page * PUB_SIZE,
    sort: {
      'analytics.views.total': -1
    },
    limit: PUB_SIZE
  });
});

Meteor.publish("starredStoriesPub", function(options) {
  options = options ? options : {};
  _.defaults(options, {page: 0});
  return Stories.find({
    published: true,
    fields: options.preview ? previewStoryFields : readStoryFields,
    skip: options.page * PUB_SIZE,
    sort: {
      'favoritedTotal': -1
    },
    limit: PUB_SIZE
  });
});

Meteor.publish("favoriteStoriesPub", function(ids) { // requires ids to be passed in
  return Stories.find({
    published: true,
    _id: { $in : ids }
  }, {
    fields: readStoryFields,
    sort: {
      publishedAt: -1
    },
    limit: PUB_SIZE
  });
});

Meteor.publish("readStoryPub", function(userPathSegment, shortId) {
  return Stories.find({
    userPathSegment: userPathSegment,
    shortId: shortId,
    published: true
  }, {
    fields: readStoryFields,
    limit: 1
  });
});

Meteor.publish("createStoryPub", function(userPathSegment, shortId) {
  return Stories.find({
    userPathSegment: userPathSegment,
    shortId: shortId,
    deleted: {$ne: true}
  }, {
    fields: {
      history: 0
    },
    limit: 1
  });
});



Meteor.publish("userStoriesPub", function(username) { // only published stories
  if (!username) {
    return this.ready();
  }

  return Stories.find({
    authorUsername: username,
    published: true
  },{
    fields : previewStoryFields,
    limit: 100 // initial limit
  });
});


Meteor.publish("myStoriesPub", function() {
  if (this.userId) {
    return Stories.find({
      authorId: this.userId,
      deleted: {$ne: true}
    }, {
      fields: previewStoryFieldsWithDraft,
      limit: 1000 // initial limit
    });
  } else {
    return this.ready();
  }
});




SearchSource.defineSource('stories', function(searchText, options) {
  options = options || {};
  _.defaults(options, {
    page: 0
  });
  var findOptions = {
    sort: [
      ["editorsPickAt", "desc"],
      ["favoritedTotal", "desc"],
      ["savedAt", "desc"]
    ],
    limit: PUB_SIZE * (options.page + 1),
    fields: previewStoryFields
  };

  if(searchText) {
    var regExp = buildRegExp(searchText);
    var selector = {$or: [{title: regExp},{ keywords: regExp},{ authorName: regExp},{ authorDisplayUsername: regExp}],
      published: true
    };
    return Stories.find(selector, findOptions).fetch();
  } else {
    return []
  }
});


// Search Source

SearchSource.defineSource('people', function(searchText, options) {
  options = options || {};
  _.defaults(options, {
    page: 0
  });
  var findOptions = {
    sort: [
      ["followersTotal", "desc"],
      ["followingTotal", "desc"],
      ["favoritesTotal", "desc"],
      ["createdAt", "desc"]
    ],
    limit: 3 * (options.page + 1),
    fields: minimalUserFields
  };

  if(searchText) {
    var regExp = buildRegExp(searchText);
    var selector = {
      username: {$exists: true},
      $or: [{username: regExp},{ 'profile.name': regExp}]
    };
    return Meteor.users.find(selector, findOptions).fetch();
  } else {
    return []
  }
});

function buildRegExp(searchText) {
  var words = searchText.trim().split(/[ \-\:]+/);
  var exps = _.map(words, function(word) {
    return "(?=.*" + word + ")";
  });
  var fullExp = exps.join('') + ".+";
  return new RegExp(fullExp, "i");
}


// Admin Publications

Meteor.publish("adminReadDraftPub", function(shortId) {
  if (!this.userId || !Meteor.users.findOne(this.userId).admin) {
    return this.ready();
  }
  return Stories.find({
    shortId: shortId
  }, {
    fields: {
      history: 0
    },
    limit: 1
  });
});


Meteor.publish("adminRecentDraftsPub", function(options) {
  options = options || {};
  options.more = options.more || 0;

  if(!this.userId || !Meteor.users.findOne(this.userId).admin){
    return this.ready();
  }

  return Stories.find({
    published: false
  }, {
    fields: previewStoryFieldsWithDraft,
    sort: {
      savedAt: -1
    },
    limit: 250 * Math.pow(2, options.more)
  });
});