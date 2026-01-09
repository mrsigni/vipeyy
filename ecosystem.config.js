// System Management by Dakila Dev

module.exports = {
    apps: [
        {
            name: 'vipey-production',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            instances: 8,
            exec_mode: 'cluster',

            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },

            max_memory_restart: '2G',

            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',

            kill_timeout: 5000,

            watch: false,
            ignore_watch: ['node_modules', 'logs', '.next'],

            instance_var: 'INSTANCE_ID',

            node_args: '--max-old-space-size=2048',
        },
    ],
};
