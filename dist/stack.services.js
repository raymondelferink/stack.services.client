angular.module('stack.services', ['btford.socket-io'])

.factory('stackSocket', ['$rootScope', '$location', function ($rootScope, $location) {
    var _this = this;
    var socket = false;
    this.api_key = "V1fUDfShl";
    this.stack_server = 'localhost:1339';
    
    this.connect = function(api_key){
        if(!api_key) api_key = this.api_key;
        if(api_key){
            socket = io.connect(this.stack_server,{query: 'key='+api_key+'&protocol='+$location.protocol()+'&host='+$location.host()+'&port='+$location.port()});
        }else{
            socket = io.connect();
        }
    }
    
    $rootScope.$on('stack:socket connect', _this.connect);
    this.connect();
    
    return {
        connect: this.connect,
        on: function (eventName, callback) {
            if(!socket){
                console.log('not connected');
            }
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        },
        reset: function(){
            socket.disconnect();
            //socket.connect();
        },
        init: function() {
            socket.removeAllListeners();
        }
    };
}])



;