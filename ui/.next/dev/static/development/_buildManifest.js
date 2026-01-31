self.__BUILD_MANIFEST = {
  "/": [
    "static/chunks/pages/index.js"
  ],
  "__rewrites": {
    "afterFiles": [
      {
        "source": "/api/:path*"
      }
    ],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/",
    "/_app",
    "/_error",
    "/api/actions/today",
    "/api/actions/[id]/complete",
    "/api/actions/[id]/skip"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()