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
            '$routeParams', '$location', '$anchorScroll', '$timeout', '$window',
        function (stackSocket, $scope, $rootScope, $filter, $routeParams, $location, $anchorScroll, $timeout, $window){
        var _this = this;
        $scope.last_id = false;
        $scope.messages = [];
        $scope.showmore = false;
        $scope.connected = false;
        $scope.destroyfn = [];
        
        $scope.rootScopeOn = function(eventname, fn){
            var destfn = $rootScope.$on(eventname, fn);
            $scope.destroyfn[$scope.destroyfn.length] = destfn;
        };
        
        $scope.stackSocketOn = function(eventname, fn){
            var destfn = stackSocket.on(eventname, fn);
            $scope.destroyfn[$scope.destroyfn.length] = destfn;
        };
        
        $scope.$on("$destroy", function() {
            for(var i = 0; i < $scope.destroyfn.length; i++){
                $scope.destroyfn[i]();
            }
        });
        
        $scope.init = function(){
            $scope.on_connect();
            $scope.join();
        };
        
        $scope.clear = function(){
            $scope.last_id = false;
            $scope.messages = [];
            $scope.showmore = false;
        };
        
        $scope.rootScopeOn('stack:socket connected', function(){
            $scope.connected = true;
            $scope.init();
            $scope.scrollDown();
        });
        
        
        $scope.rootScopeOn('stack:socket disconnected', function(){
            $scope.connected = false;
            $scope.clear();
            $scope.scrollUp();
        });
        
        $scope.join = function(){
            stackSocket.emit('chatroom join', {
                room: $scope.room,
                username: $scope.username,
                userid: $scope.userid
            });
        };
        
        $scope.on_connect = function(){
            
            stackSocket.on('chatroom message', function(data){
                if(data.success){
                    $scope.messages.push(data.message);
                    if(data.message.userid === $scope.userid){
                        $scope.scrollDown();
                    }
                }
            });
            
            stackSocket.on('chatroom join', function(data){
                
                if(data.success){
                    $scope.fetch_messages();
                }
            });

            stackSocket.on('chatroom get messages', function(data){
                
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
        }
        
        
        $scope.fetch_messages = function(){
            stackSocket.emit('chatroom get messages', {last_id: $scope.last_id});
        };
        
        $scope.scrollDown = function(){
            if($scope.connected){
                $timeout(function() {
                    $window.scrollTo(0,$window.document.body.scrollHeight);
                });
            }
        };
        
        $scope.scrollUp = function(){
            $window.scrollTo(0, 0);
        };
        
        
    }])

    .controller('chatInputController', ['stackSocket', '$scope', '$rootScope',
        function (stackSocket, $scope, $rootScope){
        var _this = this;
        $scope.new_message = "";
        $scope.connected = false;
        
        $rootScope.$on('stack:socket connected', function(){
            $scope.connected = true;
        });
        
        $rootScope.$on('stack:socket disconnected', function(){
            $scope.connected = false;
            _this.new_message = "";
        });        
        
        $scope.add_message = function(){
            stackSocket.emit('chatroom message', {message: $scope.new_message});            
            $scope.new_message = "";
        };        
    }])


    .directive("stackChatRoom", function (stack_settings) {
        return {
            restrict: "E",
            scope: {
                room: "=",
                username: "=",
                userid: "="
            },
            templateUrl: stack_settings.root + "dist/view/chat-room.html",
            controller: 'chatController',
            controllerAs: 'chatCtrl'
        };
    })
    
    .directive("stackChatItem", function (stack_settings) {
        return {
            restrict: "E",
            templateUrl: stack_settings.root + "dist/view/chat-item.html"
        };
    })
    
    .directive("stackChatInput", function (stack_settings) {
        return {
            restrict: "E",
            templateUrl: stack_settings.root + "dist/view/chat-input.html",
            controller: 'chatInputController',
            controllerAs: 'chatInCtrl',
            link: function(scope, element, attrs){
//                var body = angular.element(document).find('body').eq(0);
//                body.append(element);
                
            }
        };
    })
;