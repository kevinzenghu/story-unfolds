sendWelcomeEmail = function(userId){
  var user = Meteor.users.findOne(userId, {fields: {'emails': 1, 'profile.name': 1}});
  var email = user.emails[0].address;
  var emailName = user.profile.name;

  Mandrill.messages.sendTemplate({
    template_name: 'welcome-e-mail',
    template_content: [
    ],
    message: {
      to: [
        {
          email: email,
          name: emailName
        }
      ]
    }
  });
};

var getToFromUserIds = function(userIds){
  var users = Meteor.users.find({_id: {$in: userIds}}, {fields: {'emails': 1, 'profile.name': 1}});
  return users.map(function(user){
    return {
      email: user.emails[0].address,
      name: user.profile.name
    }
  });
};

var getMergeVarsFromObj = function(obj){
  return _.chain(obj)
    .pairs()
    .map(function(pair){
      return {
        name: pair[0],
        content: pair[1]
      }
    })
    .value()
}


sendFollowingPublishedEmail = function(userIds, storyId){
  var to = getToFromUserIds(userIds);

  var story = Stories.findOne(storyId, {fields: readStoryFields});

  var title = story.title;
  var authorName = story.authorName;
  var longContentPreview = story.contentPreview();
  var subject = authorName + ' just published "' + title + '" on FOLD';

  var bareMergeVars = {};

  bareMergeVars.title = title;
  bareMergeVars.authorName = authorName;
  bareMergeVars.subject = subject;

  bareMergeVars.headerImageUrl = 'https:' + story.headerImageUrl();
  bareMergeVars.contentPreview = longContentPreview.length > 203 ? longContentPreview.substring(0, 200).replace(/\s+\S*$/, "...") : longContentPreview;
  bareMergeVars.profileUrl = Meteor.absoluteUrl('profile/' + (story.authorDisplayUsername || story.authorUsername));
  bareMergeVars.storyUrl = Meteor.absoluteUrl('read/' + story.userPathSegment + '/' + story.storyPathSegment);

  console.log(Mandrill.messages.sendTemplate({
    template_name: 'following-published',
    template_content: [
    ],
    message: {
      to: to,
      subject: subject,
      global_merge_vars: getMergeVarsFromObj(bareMergeVars)
    },
    preserve_recipients: false
  }));
};

sendFollowedYouEmail = function(userId, followingUserId){
  var to = getToFromUserIds([userId]);

  var followingUser = Meteor.users.findOne(followingUserId, {fields: {'profile.name': 1,'profile.bio': 1,'profile.profilePicture': 1, 'displayUsername': 1, 'services.twitter.id': 1}});

  var fullName = followingUser.profile.name; // = story.authorName;
  var username = followingUser.displayUsername; // = story.authorName;
  var subject = fullName + ' (' + username + ') just followed you on FOLD';

  var bareMergeVars = {};

  bareMergeVars.fullName = fullName;
  bareMergeVars.subject = subject;
  bareMergeVars.bio = followingUser.profile.bio;
  bareMergeVars.firstName = fullName.split(' ')[0];
  bareMergeVars.profilePicUrl = 'https:' + getProfileImage(followingUser.profile.profilePicture, (followingUser.services && followingUser.services.twitter) ? followingUser.services.twitter.id : null, 'large');
  bareMergeVars.profileUrl = Meteor.absoluteUrl('profile/' + followingUser.displayUsername);

  console.log(bareMergeVars)


  console.log(Mandrill.messages.sendTemplate({
    template_name: 'followed-you',
    template_content: [
    ],
    message: {
      to: to,
      subject: subject,
      global_merge_vars: getMergeVarsFromObj(bareMergeVars)
    },
    preserve_recipients: false
  }));
};

