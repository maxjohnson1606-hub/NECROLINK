// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // Migrate deprecated webpack-dev-server middleware APIs to new setupMiddlewares
  const beforeSetup = devServerConfig.onBeforeSetupMiddleware;
  const afterSetup = devServerConfig.onAfterSetupMiddleware;
  delete devServerConfig.onBeforeSetupMiddleware;
  delete devServerConfig.onAfterSetupMiddleware;

  // Migrate deprecated 'https' option to 'server'
  if (devServerConfig.https !== undefined) {
    devServerConfig.server = devServerConfig.https ? "https" : "http";
    delete devServerConfig.https;
  }

  const originalSetupMiddlewares = devServerConfig.setupMiddlewares;
  devServerConfig.setupMiddlewares = (middlewares, devServer) => {
    if (beforeSetup) beforeSetup(devServer);
    if (originalSetupMiddlewares) {
      middlewares = originalSetupMiddlewares(middlewares, devServer);
    }
    if (afterSetup) afterSetup(devServer);

    // Setup health endpoints if enabled
    if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
      setupHealthEndpoints(devServer, healthPluginInstance);
    }

    return middlewares;
  };

  // Allow preview host
  devServerConfig.allowedHosts = "all";

  // Proxy /api requests to the backend server (array format for webpack-dev-server v5)
  devServerConfig.proxy = [
    {
      context: ["/api"],
      target: "http://localhost:8000",
      changeOrigin: true,
      secure: false,
    },
  ];

  return devServerConfig;
};

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
// Temporarily disabled due to webpack-dev-server v5 compatibility issues
// if (isDevServer) {
//   try {
//     const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
//     webpackConfig = withVisualEdits(webpackConfig);
//   } catch (err) {
//     if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
//       console.warn(
//         "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
//       );
//     } else {
//       throw err;
//     }
//   }
// }

module.exports = webpackConfig;
