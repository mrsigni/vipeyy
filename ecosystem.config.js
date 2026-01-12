module.exports = {
    apps: [
        {
            name: 'vipey-production',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            instances: 1,
            exec_mode: 'fork',

            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },

            max_memory_restart: '2G',
            node_args: '--max-old-space-size=2048',

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
        },
    ],
};