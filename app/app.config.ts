export default defineAppConfig({
  appStartDate: '2026-03-31',
  datingStart: '2026-06-23',
  ui: {
    colors: {
      primary: 'red',
      neutral: 'mist'
    },
    container: {
      base: 'px-5'
    },
    button: {
      slots: {
        base: 'rounded-lg'
      }
    },
    input: {
      slots: {
        base: 'rounded-lg'
      }
    },
    inputTime: {
      slots: {
        base: 'rounded-lg'
      }
    },
    inputTags: {
      slots: {
        base: 'rounded-lg'
      }
    },
    textarea: {
      slots: {
        base: 'rounded-lg'
      }
    },
    badge: {
      slots: {
        base: 'rounded-lg'
      }
    }
  },
});