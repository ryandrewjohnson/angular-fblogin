(function () {
    "use strict";

    /**
     * $fblogin
     * @property {object}   options     - settings for fblogin plugin.
     * 
     * Required:
     * options.fbId         {string}    - the Facebook app id
     *
     * Optional:
     * options.permissions  {string}    - a comma seperated list of FB permissions. See http://bit.ly/1plqJSs
     * options.fields       {string}    - a comma seperated list of field ids. See http://bit.ly/1plrevO 
     * options.success      {function}  - callback that will be triggered when data is successfully returned from FB.
     * options.error        {function}  - callback that will be triggered by any errors.
     */
    angular.module('angularFblogin', [])

    .factory('$fblogin', function ($q) {

        /**
         * Private Props
         * @property {object}  __               - add private module functions here.
         * @property {object}  isSdkLoaded      - a flag for when the FB SDK has loaded.
         * @property {object}  isFbInitiated    - a flag for when FB.init has been called.
         * @property {object}  $dfd             - stores an instance of angular $q.defer()
         */
        var __,           
            isSdkLoaded,      
            isFbInitiated,
            options,
            $dfd;

        
        // PRIVATE FUNCTIONS
        __ = {  
            init: function () {
                // FB ID is required
                if (!options.fbId) {
                        throw new Error('Required option "fbId" is missing!');
                }

                options.permissions = options.permissions || '';
                options.fields = options.fields || '';
                options.success = options.success || function(){};
                options.error = options.error || function(){};

                __.listenForFbAsync();
            },
            listenForFbAsync: function () {
                if (window.fbAsyncInit) {
                    var notMyFunction = window.fbAsyncInit;
                }
                // listen for FB SDK load
                window.fbAsyncInit = function() {
                    __.initFB();
                    isSdkLoaded = true;
                    if (notMyFunction) { notMyFunction(); }
                };

                if (isSdkLoaded || window.FB) {
                    window.fbAsyncInit();
                    return;
                }
            },
            initFB: function () {
                if (!isFbInitiated) {
                    window.FB.init({
                        appId      : options.fbId,
                        cookie     : true,
                        xfbml      : true,
                        version    : 'v2.0'
                    });

                    isFbInitiated = true;
                }
                
                $dfd.notify({status: 'init.fblogin'});
            },
            loginToFB: function () {
                window.FB.login(function(response) {
                    if (response.authResponse) {

                        $dfd.notify({
                            status: 'authenticate.fblogin',
                            data: response
                        });

                    } else {
                        // mimic facebook sdk error format
                        $dfd.reject({
                            error: {
                                message: 'User cancelled login or did not fully authorize.'
                            }
                        });
                    }
                }, {
                    scope: options.permissions, 
                    return_scopes: true
                });
            },
            getFbFields: function (accessToken) {
                FB.api('/me', {fields: options.fields}, function(response) {
                    if (response && !response.error) {
                        $dfd.resolve(response);
                    } 
                    else {
                        $dfd.reject(response);
                    }
                });
            },
            onComplete: function (data) {
                options.success(data);
            },
            onProgress: function (response) {
                // This monitors the FB login progresssion
                // 1. Init FB
                // 2. FB.login
                // 3. Get user data
                if( response.status === 'init.fblogin' ) {
                    __.loginToFB();
                } else if( response.status === 'authenticate.fblogin' ) {
                     __.getFbFields(response.data.authResponse.accessToken);
                } else {
                    $dfd.reject();
                }
            },
            onError: function (err) {
                options.error(err);
            }
        };


        return function (settings) {

            options = settings || {};
            isSdkLoaded = false;
            isFbInitiated = false;
            $dfd = $q.defer();

            $dfd.promise.then(
                __.onComplete,
                __.onError,
                __.onProgress
            );

            // here we go!
            __.init(options);

            return $dfd.promise;
        };
    });


    

})();