'use strict';

angular.module('stack.interact', ['stack.services'])
    
.service('interactionService', ['stackSettings', 'stackServices', 'stackSocket', '$rootScope', 
        function(stackSettings, stackServices, stackSocket, $rootScope){

    var _this = this;
    this.interval_interrupt = false;

    this.state = false;
    this.userid = false;
    this.room = false;

    this.poll_interval = stackSettings.poll_interval; // 30 seconds between polls
    this.last_id = false;
    this.connected = false;
    this.destroyfn = [];

    this.rootScopeOn = function(eventname, fn){
        var destfn = $rootScope.$on(eventname, fn);
        this.destroyfn.push(destfn);
    };

    this.stackSocketOn = function(eventname, fn){
        var destfn = stackSocket.on(eventname, fn);
        this.destroyfn.push(destfn);
    };

    this.disconnect = function() {

        stackSocket.disconnect();

        $rootScope.$broadcast('sts:interaction disconnected');

        for(var i = 0; i < this.destroyfn.length; i++){
            this.destroyfn[i]();
        }

        this.leading = false;
        this.connected = false;
    };

    this.init = function(lead){

        if(lead){
            this.stackSocketOn('sts:room user joined', function(data){
                console.log('sts:room user joined', data);
            });

            this.stackSocketOn('sts:room user left', function(data){
                console.log('sts:room user left', data);
            });

            this.stackSocketOn('sts:room users present', function(data){
                console.log('sts:room users present', data);
            });

            $rootScope.$broadcast('sts:interaction leading');
        } else {
            this.stackSocketOn('sts:room action', function(data){
                console.log('sts:room action', data);
                $rootScope.$broadcast('sts:interaction action', data);
            });

            this.stackSocketOn('sts:room leader left', function(data){
                //stop following leader has left
                console.log('sts:room leader left', data);
                _this.disconnect();
            });

            $rootScope.$broadcast('sts:interaction following');
        }

        this.leading = lead;
        this.connected = true;
    }

    this.connect = function(connect, lead){
        if(connect){
            stackSocket.connect(stackSettings.api_key);
            if(lead){
                //set listeners for leaders
                this.stackSocketOn('sts:room lead', function(data){
                    console.log('sts:room lead', data);
                    if(data.success){
                        _this.init(true);
                    } else {
                        _this.disconnect();
                    }
                });
            } else {
                //set listeners for followers
                this.stackSocketOn('sts:room follow', function(data){
                    console.log('sts:room follow', data);
                    if(data.success){
                        _this.init(false);
                    } else {
                        _this.disconnect();
                    }
                });
            }

        } else {
            this.disconnect();
        }

    };

    this.lead = function(room, username, user_code){
        this.connect(true, true);
        stackSocket.emit('sts:room lead', {
            room: room,
            username: username,
            userid: user_code
        });
    };

    this.follow = function(room, username, user_code){
        this.connect(true, false);
        stackSocket.emit('sts:room follow', {
            room: room,
            username: username,
            userid: user_code
        });
    };

    this.broadcast = function(action){
        if(this.connected && this.leading){
            stackSocket.emit('sts:room broadcast', {
                action: action
            });
        }
    };

    this.status = function(){
        if(this.connected){
            if (this.leading){
                return 1;
            } else {
                return 2;
            }
        } else {
            return 0;
        }
    };

}])

.controller('interactionIndicatorController', ['interactionService', '$scope', '$rootScope',
    function (interactionService, $scope, $rootScope){
    var _this = this;

    this.status = interactionService.status();

    $scope.$on('sts:interaction disconnected', function(){
        _this.status = interactionService.status();
    });

    $scope.$on('sts:interaction leading', function(){
        _this.status = interactionService.status();
    });

    $scope.$on('sts:interaction following', function(){
        _this.status = interactionService.status();
    });

}])

.controller('interactionOptionController', ['interactionService', '$scope', function(interactionService, $scope){
    console.log('test');
    this.lead = function(){
        interactionService.lead('test', $scope.username, $scope.userid);
    };

    this.follow = function(){
        interactionService.follow('test', $scope.username, $scope.userid);
    };
}])

.directive("stackInteractionIndicator", function(stackSettings){
    return{
        restrict: "E",
        templateUrl: stackSettings.root + "dist/view/interaction-indicator.html",
        scope: {},
        controller: 'interactionIndicatorController',
        controllerAs: 'intIndCtrl'
    };
})

.directive("stackInteractionOption", function(stackSettings){
    return{
        restrict: "E",
        templateUrl: stackSettings.root + "dist/view/interaction-option.html",
        scope: {
            username: "=",
            userid: "="
        },
        replace: true,
        controller: 'interactionOptionController',
        controllerAs: 'intOptCtrl'
    };
})
;
