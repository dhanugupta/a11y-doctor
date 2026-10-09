// eslint.config.mjs: Vue accessibility linting (flat config)
//   npm i -D eslint eslint-plugin-vue eslint-plugin-vuejs-accessibility
import pluginVue from 'eslint-plugin-vue';
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility';

export default [
  ...pluginVue.configs['flat/recommended'],
  ...pluginVueA11y.configs['flat/recommended'],
  {
    rules: {
      // Accept design-system inputs as labelled controls
      'vuejs-accessibility/form-control-has-label': ['error', { labelComponents: ['FormLabel'] }],
    },
  },
];
