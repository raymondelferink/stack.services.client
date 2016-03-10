angular.module('stack.services', ['btford.socket-io'])

.value('stackSettings', {
        api_key: 'V1fUDfShl',
        api_uri: 'http://stack.services',
        endpoint_chat: '/chat'
    }
)


.factory('stackSocket', ['stackSettings', '$rootScope', '$location', function (stackSettings, $rootScope, $location) {
    var _this = this;
    var socket = false;
    this.api_key = stackSettings.api_key;
    this.stack_server = stackSettings.api_uri;
    var destroy_fun = false;
    
    this.connect = function(e, api_key){
        if(!api_key){
            api_key = _this.api_key;
        }else{
            _this.api_key = api_key;
        }
        
        if(api_key){
            socket = io.connect(_this.stack_server,{query: 'key='+api_key+'&protocol='+$location.protocol()+'&host='+$location.host()+'&port='+$location.port()});
            
            this.on('stack api connect', function(){
                $rootScope.$broadcast('stack:socket connected');
            }, true);
        }else{
            console.log('stack.services: no api key');
        }
        
    };
    
    this.disconnect = function(){
        if(socket){
            
            socket.io.close();
//            socket.removeAllListeners();
            socket = false;
        }
        $rootScope.$broadcast('stack:socket disconnected');
    };
    
    this.on = function (eventName, callback, destroy_first) {
        if(!socket){
            console.log('not connected');
        }else{
            if(destroy_first){
                socket.removeListener(eventName);
            }
            var fn = function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            };
            socket.on(eventName, fn);
            return function(){
                socket.removeListener(eventName, fn);
            };
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
            this.disconnect();
            this.connect();
        },
        init: function() {
            socket.removeAllListeners();
        }
    };
}])



;