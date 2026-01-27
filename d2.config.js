const config = {
    name: 'sympheos',
    title: 'Sympheos™',
    type: 'app',

    // id: '92b75fd0-34cc-451c-942f-3dd0f283bcbd',
    minDHIS2Version: '2.39',
    maxDHIS2Version: '2.41',
    coreApp: false,

    entryPoints: {
        app: './src/index',
    },
};

module.exports = config;
