const ALLOWED_ORIGIN = "https://shakedim.github.io";

const KICK_CHANNEL = "shakedim";

export default {
    async fetch(request, env) {

        const url = new URL(request.url);

        /*
        CORS
        */
        const corsHeaders = {
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "no-store"
        };

        /*
        OPTIONS request
        */
        if (request.method === "OPTIONS") {

            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });

        }

        /*
        Only GET
        */
        if (request.method !== "GET") {

            return new Response(
                JSON.stringify({
                    error: "Method not allowed"
                }),
                {
                    status: 405,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }

        try {

            /*
            -----------------------------------------
            1. GET KICK APP ACCESS TOKEN
            -----------------------------------------
            */

            const tokenResponse = await fetch(
                "https://id.kick.com/oauth/token",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded"
                    },

                    body: new URLSearchParams({

                        grant_type:
                            "client_credentials",

                        client_id:
                            env.KICK_CLIENT_ID,

                        client_secret:
                            env.KICK_CLIENT_SECRET

                    })
                }
            );


            if (!tokenResponse.ok) {

                return new Response(
                    JSON.stringify({
                        live: false,
                        error: "Could not authenticate with Kick"
                    }),
                    {
                        status: 502,
                        headers: {
                            ...corsHeaders,
                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            }


            const tokenData =
                await tokenResponse.json();


            const accessToken =
                tokenData.access_token;


            if (!accessToken) {

                throw new Error(
                    "Kick did not return an access token"
                );

            }


            /*
            -----------------------------------------
            2. FIND SHAKEDIM'S BROADCASTER ID
            -----------------------------------------
            */

            const channelResponse = await fetch(
                "https://api.kick.com/public/v1/channels?slug=" +
                encodeURIComponent(KICK_CHANNEL),

                {
                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );


            if (!channelResponse.ok) {

                throw new Error(
                    "Could not get Kick channel"
                );

            }


            const channelData =
                await channelResponse.json();


            const channel =
                channelData.data?.[0];


            if (!channel) {

                throw new Error(
                    "Kick channel not found"
                );

            }


            const broadcasterId =
                channel.broadcaster_user_id;


            /*
            -----------------------------------------
            3. CHECK CURRENT LIVESTREAM
            -----------------------------------------
            */

            const liveUrl =
                "https://api.kick.com/public/v2/livestreams" +
                "?broadcaster_user_id=" +
                encodeURIComponent(broadcasterId);


            const liveResponse =
                await fetch(
                    liveUrl,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`
                        }
                    }
                );


            if (!liveResponse.ok) {

                throw new Error(
                    "Could not get livestream status"
                );

            }


            const liveData =
                await liveResponse.json();


            /*
            If Kick returns at least one
            livestream for this broadcaster,
            the channel is live.
            */

            const isLive =
                Array.isArray(liveData.data) &&
                liveData.data.length > 0;


            /*
            -----------------------------------------
            4. RETURN ONLY WHAT OUR WEBSITE NEEDS
            -----------------------------------------
            */

            return new Response(

                JSON.stringify({
                    live: isLive
                }),

                {
                    status: 200,

                    headers: {
                        ...corsHeaders,
                        "Content-Type":
                            "application/json"
                    }
                }

            );


        } catch (error) {

            console.error(error);


            /*
            Never show LIVE if the API fails.
            */

            return new Response(

                JSON.stringify({
                    live: false
                }),

                {
                    status: 200,

                    headers: {
                        ...corsHeaders,
                        "Content-Type":
                            "application/json"
                    }
                }

            );

        }

    }
};
