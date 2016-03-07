angular.module('stack.services', ['btford.socket-io'])

.factory('stackSocket', ['$rootScope', '$location', function ($rootScope, $location) {
    var _this = this;
    var socket = false;
    this.api_key = "V1fUDfShl";
    this.stack_server = 'http://stack.services';
    
    this.connect = function(e, api_key){
        if(!api_key) api_key = _this.api_key;
        
        if(api_key){
            socket = io.connect(_this.stack_server,{query: 'key='+api_key+'&protocol='+$location.protocol()+'&host='+$location.host()+'&port='+$location.port()});
        
            this.on('stack api connect', function(){
                console.log('stack api connect');
                $rootScope.$broadcast('stack:socket connected');
            });
        }else{
            console.log('stack.services: no api key');
        }
        
    };
    
    this.disconnect = function(){
        socket.io.close();
        $rootScope.$broadcast('stack:socket disconnected');
    };
    
    this.on = function (eventName, callback) {
        if(!socket){
            console.log('not connected');
        }else{
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        }
    };
    
    
    
//    $rootScope.$on('stack:socket connect', _this.connect);
    //this.connect();
    
    return {
        connect: this.connect,
        disconnect: this.disconnect,
        on: this.on,
        emit: function (eventName, data, callback) {
            if(!socket){
                console.log('not connected');
            }else{
                socket.emit(eventName, data, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                });
            }
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