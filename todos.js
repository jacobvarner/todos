Todos = new Mongo.Collection('todos');
Lists = new Mongo.Collection('lists');

Router.route('/register');

Router.route('/login');

Router.route('/', {
  name: 'home',
  template: 'home'
});

Router.configure({
  layoutTemplate: 'main',
  loadingTemplate: 'loading'
});

Router.route('/list/:_id', {
  name: 'listPage',
  template: 'listPage',
  data: function(){
    var currentList = this.params._id;
    var currentUser = Meteor.userId();
    return Lists.findOne({ createdBy: currentUser, _id: currentList });
  },
  onBeforeAction: function(){
    var currentUser = Meteor.userId();
    if(currentUser) {
      this.next();
    } else {
      this.render('login');
    }
  },
  waitOn: function(){
    var currentList = this.params._id
    return Meteor.subscribe('todos', currentList);
  }
});

if(Meteor.isClient){
  $.validator.setDefaults({
    rules: {
      email: {
        required: true,
        email: true
      },
      password: {
        required: true,
        minlength: 6
      }
    },
    messages: {
      email: {
        required: "You must enter an email address.",
        email: "You've entered an invalid email address."
      },
      password: {
        required: "You must enter a password.",
        minlength: "Your password must be at least {0} characters."
      }
    }
  });

  Template.lists.onCreated(function(){
    this.subscribe('lists');
  });

  Template.login.onCreated(function(){
    console.log("The 'login' template was just created.");
  });

  Template.login.onRendered(function(){
    var validator = $('.login').validate({
      submitHandler: function(event){
        var email = $('[name=email]').val();
        var password = $('[name=password]').val();
        Meteor.loginWithPassword(email, password, function(error){
          if(error){
            if(error.reason == "User not found"){
              validator.showErrors({
                email: "That email doesn't belong to a registered user."
              });
            }
            if(error.reason == "Incorrect password"){
              validator.showErrors({
                password: "You entered an incorrect password."
              });
            }
          } else {
            var currentRoute = Router.current().route.getName();
            if (currentRoute == "login") {
              Router.go('home');
            }
          }
        });
      }
    });
  });

  Template.register.onRendered(function(){
    var validator = $('.register').validate({
      submitHandler: function(event){
        var email = $('[name=email]').val();
        var password = $('[name=password]').val();
        Accounts.createUser({
          email: email,
          password: password
        }, function(error){
          if(error){
            if(error.reason == "Email already exists."){
              validator.showErrors({
                email: "That email already belongs to a registered user."
              });
            }
          } else {
            Router.go("home");
          }
        });
      }
    });
  });

  Template.login.onDestroyed(function(){
    console.log("The 'login' template was just destroyed.");
  });

  // Client code goes here
  Template.todos.helpers({
    'todo': function(){
      var currentList = this._id;
      var currentUser = Meteor.userId();
      return Todos.find({ createdBy: currenUser, listId: currentList }, {sort: {createdAt: -1}});
    }
  });

  Template.addTodo.events({
    'submit form': function(event){
      event.preventDefault();
      var todoName = $('[name="todoName"]').val();
    }
  });

  Template.todoItem.events({
    'click .delete-todo': function(event){
      event.preventDefault();
      var documentId = this._id;
      var confirm = window.confirm("Delete this task?");
      if(confirm){
        Todos.remove({ _id: documentId });
      }
    },
    'keyup [name=todoItem]': function(event){
      if(event.which == 13 || event.which == 27){
        $(event.target).blur();
      } else {
        var documentId = this._id;
        var todoItem = $(event.target).val();
        Todos.update({ _id: documentId }, {$set: { name: todoItem }});
      }
    },
    'change [type=checkbox]': function(){
      var documentId = this._id;
      var isCompleted = this.completed;
      if(isCompleted){
        Todos.update({ _id: documentId }, {$set: { completed: false }});
      } else {
        Todos.update({ _id: documentId }, {$set: { completed: true }});
      }
    }
  });

  Template.todoItem.helpers({
    'checked': function(){
      var isCompleted = this.completed;
      if(isCompleted){
        return "checked";
      } else {
        return "";
      }
    }
  });

  Template.todosCount.helpers({
    'totalTodos': function(){
      var currentList = this._id;
      return Todos.find({ listId: currentList }).count();
    },
    'completedTodos': function(){
      var currentList = this._id;
      return Todos.find({ listId: currentList, completed: true }).count();
    }
  });

  Template.addList.events({
    'submit form': function(event){
      event.preventDefault();
      var listName = $('[name=listName]').val();
      Meteor.call('createNewList', listName, function() {
        if(error){
          console.log(error.reason);
        } else {
          Router.go('listPage', { _id: results });
          $('[name=listName]').val('');
        }
      });
    }
  });

  Template.lists.helpers({
    'list': function(){
      var currentUser = Meteor.userId();
      return Lists.find({ createdBy: currentUser }, {sort: {name: 1}});
    }
  });

  Template.register.events({
    'submit form': function(event){
      event.preventDefault();
      /*var email = $('[name=email]').val();
      var password = $('[name=password]').val();
      Accounts.createUser({
        email: email,
        password: password
      }, function(error){
        if(error) {
          console.log(error.reason);
        } else {
          Router.go('home');
        }
      });*/
    }
  });

  Template.login.events({
    'submit form': function(event){
      event.preventDefault();
    }
  })

  Template.navigation.events({
    'click .logout': function(event){
      event.preventDefault();
      Meteor.logout();
      Router.go('login');
    }
  });

}

if(Meteor.isServer){
  // Server code goes here
  Meteor.publish('lists', function(currentList){
    var currentUser = this.userId;
    return Lists.find({ createdBy: currentUser, listId: currentList });
  });

  Meteor.publish('todos', function(){
    var currentUser = this.userId;
    return Todos.find({ createdBy: currentUser })
  });

  Meteor.methods({
    'createNewList': function(listName) {
      var currentUser = Meteor.userId();
      if(listName == ""){
        listName = defaultName(currentUser);
      }
      check(listName, String);
      var data = {
        name: listName,
        createdBy: currentUser
      }
      if(!currentUser){
        throw new Meteor.Error("not-logged-in", "You're not logged-in.");
      }
      return Lists.insert(data);
    }
  });

  function defaultName(currentUser) {
    var nextLetter = 'A'
    var nextName = 'List ' + nextLetter;
    while (Lists.findOne({ name: nextName, createdBy: currentUser })) {
      nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
      nextName = 'List ' + nextLetter;
    }
    return nextName;
  }
}
