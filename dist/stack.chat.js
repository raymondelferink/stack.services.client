'use strict';

angular.module('stack.chat', ['stack.services'])

    .value('stack_settings', {
        root: 'bower_components/stack.services.client/'
    })
    
    .filter('initials', function() {
        return function(name) {
            var n = name.split(" ");
            var ns = false;
            var ini = "";
            for(var i = 0; i < n.length; i++){
                ns = n[i].split("-");
                for(var j = 0; j < ns.length; j++){
                    ini += ns[j].charAt(0);
                    if(ini.length === 3){
                        break;
                    }
                }
                if(ini.length === 3){
                    break;
                }
            }
            
            if(ini.length === 1 && n[0].length > 1){
                ini == n[0].charAt(1);
            }
            
            return ini;
        };
    })
      
    .controller('chatController', ['stackSocket', '$scope', '$rootScope', '$filter', 
            '$routeParams', '$location', '$anchorScroll', '$timeout',
        function (stackSocket, $scope, $rootScope, $filter, $routeParams, $location, $anchorScroll, $timeout){
        var _this = this;
        $scope.last_id = false;
        $scope.new_message = "";
        $scope.messages = [];
        $scope.showmore = false;
        
        $scope.add_message = function(){
            console.log('add_message', $scope.new_message);
            stackSocket.emit('chatroom message', {message: $scope.new_message});            
            $scope.new_message = '';
        };
        stackSocket.on('chatroom message', function(data){
            if(data.success){
                $scope.messages.push(data.message);
                if(data.message.userid === $scope.userid){
                    $scope.scrollDown();
                }
            }
        });
        
        $scope.fetch_messages = function(){
            stackSocket.emit('chatroom get messages', {last_id: $scope.last_id});
        }
        
        console.log('chat');
        
        
        this.init = function(){
            this.join();
        };
        
        this.join = function(){
            
            stackSocket.emit('chatroom join', {
                room: $scope.room,
                username: $scope.username,
                userid: $scope.userid
            });
        };        
        stackSocket.on('chatroom join', function(data){
            console.log('chatroom join', data);
            if(data.success){
                $scope.fetch_messages();
            }
        });
        
        stackSocket.on('chatroom get messages', function(data){
            console.log('chatroom get messages', data);
            if(data.success){
                if(data.messages && data.messages.length >0){
                    var messages = $filter('orderBy')(data.messages, '_id');
                    var last_id = messages[0]._id;
                    
                    if(!$scope.last_id || last_id < $scope.last_id){
                        $scope.messages = $scope.messages.concat(data.messages);
                        if(!$scope.last_id){
                            $scope.scrollDown();
                        }else{
                            $scope.scrollDown('chat_'+$scope.last_id);
                        }
                        $scope.last_id = last_id;
                        $scope.showmore = (data.pagesize === data.messages.length);
                    }
                }else{
                    $scope.showmore = false;
                }
            }
        });
        
        stackSocket.on('chatroom users present', function(data){
            console.log('chatroom users present', data);
        });
        
        $scope.scrollDown = function(){
            $timeout(function() {
                $location.hash('bottom');
                $anchorScroll();
            });
        };
        
        this.init();
        
    }])


    .directive("stackChatRoom", function (stack_settings) {
        return {
            restrict: "E",
            scope: {
                room: "=",
                username: "=",
                userid: "="
            },
            templateUrl: stack_settings.root + "chat-room.html",
            controller: 'chatController',
            controllerAs: 'chatCtrl'
        };
    })
    
    .directive("stackChatItem", function (stack_settings) {
        return {
            restrict: "E",
            templateUrl: stack_settings.root + "chat-item.html"
        };
    })
;