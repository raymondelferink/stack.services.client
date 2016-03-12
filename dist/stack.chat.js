'use strict';

angular.module('stack.chat', ['stack.services'])
    
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
    
    .service('chatService', ['stackSettings', '$http', '$interval', '$rootScope', 
            function(stackSettings, $http, $interval, $rootScope){
        var _this = this;
        this.interval_interrupt = false;
        this.room = false;
        this.poll_interval = 3000;
        this.last_id = false;
        this.connected = false;
//        this.check_messages("kamer", "56dc2dfa19a1e7c02eb1ef36");
            //http://localhost:1339/api/chat/count/V1fUDfShl/kamer/56dc2dfa19a1e7c02eb1ef36

        this.check_messages = function(room, last_id){
            if(!this.connected){
                var room = this.room;
                var last_id = this.last_id;
                var check_request = stackSettings.api_uri + stackSettings.endpoint_chat + "/count/" + stackSettings.api_key + "/"+ room + "/";
                if(last_id){
                    check_request += last_id;
                }

                $http.get(check_request).then(
                    function(response){
                        console.log('check_messages success', response.data);
                        if(response.data && 
                                response.data.count && 
                                response.data.count > 0){
                            console.log('broadcast', response.data.count);
                            $rootScope.$broadcast('stack.chat: new messages', response.data);
                        }
                    }, 
                    function(response){
                        console.log('check_messages fail', response.data);
                    });
            }
        };
        
        this.set_interval = function(){
            console.log('set_interval')
            this.stop_interval();
            
            this.interval_interrupt = $interval(function() {
                    _this.check_messages();
                }, 
                this.poll_interval
            );
        };
        
        this.stop_interval = function(){
            $interval.cancel(this.interval_interrupt);
        };
        
        this.set_room = function(room){
            this.room = room;
            this.check_messages();
            this.set_interval();
        };
        
        this.set_last_id = function(last_id){
            this.last_id = last_id;
        };
        
        this.connect = function(connected){
            this.connected = connected;
        };
        
        $rootScope.$on('stack:socket connected', function(){
            _this.connect(true);
        });
        
        $rootScope.$on('stack:socket disconnected', function(){
            _this.connect(false);
        });
        
    }])

    .controller('chatController', ['chatService', 'stackSocket', '$scope', '$rootScope', '$filter', 
            '$routeParams', '$location', '$anchorScroll', '$timeout', '$window',
        function (chatService, stackSocket, $scope, $rootScope, $filter, $routeParams, $location, $anchorScroll, $timeout, $window){
        var _this = this;
        $scope.oldest_id = false;
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
            $scope.oldest_id = false;
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
                    chatService.set_last_id(data.message._id);
                }
            });
            
            stackSocket.on('chatroom join', function(data){
                
                if(data.success){
                    //chatService.set_room($scope.room);
                    $scope.fetch_messages();
                    $rootScope.$broadcast('stack.chat: new messages', {count: 0});
                }
            });

            stackSocket.on('chatroom get messages', function(data){
                
                if(data.success){
                    if(data.messages && data.messages.length >0){

                        var oldest_id = data.messages[data.messages.length-1]._id;
                        
                        if(!$scope.oldest_id || oldest_id < $scope.oldest_id){
                            $scope.messages = $scope.messages.concat(data.messages);
                            if(!$scope.oldest_id){
                                $scope.scrollDown();
                            }else{
                                $scope.scrollDown('chat_'+$scope.oldest_id);
                            }
                            $scope.oldest_id = oldest_id;
                            $scope.showmore = (data.pagesize === data.messages.length);
                            if($scope.messages.length > 0){
                                chatService.set_last_id($scope.messages[0]._id);
                            }
                        }
                    }else{
                        $scope.showmore = false;
                    }
                }
            });

            stackSocket.on('chatroom users present', function(data){
                console.log('chatroom users present', data);
            });
        };
        
        
        $scope.fetch_messages = function(){
            stackSocket.emit('chatroom get messages', {oldest_id: $scope.oldest_id});
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

    .controller('chatIndicatorController', ['stackSocket', '$scope', '$rootScope',
        function (stackSocket, $scope, $rootScope){
        var _this = this;
        $scope.new_count = 0;
        
        $rootScope.$on('stack.chat: new messages', function(e, data){
            console.log('on', data.count, data.count > 0);
            $scope.new_count = data.count;
        });     
    }])


    .directive("stackChatRoom", function (stackSettings) {
        return {
            restrict: "E",
            scope: {
                room: "=",
                username: "=",
                userid: "="
            },
            templateUrl: stackSettings.root + "dist/view/chat-room.html",
            controller: 'chatController',
            controllerAs: 'chatCtrl'
        };
    })
    
    .directive("stackChatItem", function (stackSettings) {
        return {
            restrict: "E",
            templateUrl: stackSettings.root + "dist/view/chat-item.html"
        };
    })
    
    .directive("stackChatInput", function (stackSettings) {
        return {
            restrict: "E",
            templateUrl: stackSettings.root + "dist/view/chat-input.html",
            controller: 'chatInputController',
            controllerAs: 'chatInCtrl',
            link: function(scope, element, attrs){
//                var body = angular.element(document).find('body').eq(0);
//                body.append(element);
                
            }
        };
    })
    
    .directive("stackChatIndicator", function(stackSettings){
        return{
            restrict: "E",
            templateUrl: stackSettings.root + "dist/view/chat-indicator.html",
            scope: {},
            controller: 'chatIndicatorController',
            controllerAs: 'chatIndCtrl'
        };
    })
;