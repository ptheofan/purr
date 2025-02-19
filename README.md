# Scope
The easiest way to connect rr (sonarr, radarr, prowlarr, etc) to put.io

# No external Services Dependencies
This is built purposefully without any external service dependencies. You do not need any database
and can be configured entirely over environment variables.

# Quality of Life
A large chunk of the code is unit tested to ensure things work as expected and project can evolve without breaking.

# How to run
The codebase is built using `nestjs` running on `nodejs 20.x`. It will most likely run on earlier `nodejs` versions
as well but it is not tested.

# Configuration
Either provide a `.env` file or set the variables as seen in the `.env.example` file in your environment. The `.env.example`
you see contains the default values. Those marked with `xxx` need to be setup for your system by you. Just follow the
in-place instructions.

## Watcher
You can link a local folder to a put.io folder. The watcher will watch the local folder and upload any new files to the
put.io folder. This is useful for automatically uploading files from your download folder to put.io. in the correct folder.
You can create multiple watchers for multiple folders and upload in a single put.io folder or a have a dedicated put.io
folder per local folder.

### Scenario
Let's assume you have 2 folders you want to watch and you wish to download the files also two seperate folders.

#### Watchers
One folder is coming from blackhole sonarr and another from blackhole radarr.
You want to upload the files to put.io in the `tv` folder for sonarr and `movies` folder for radarr.
Let's assume your local folder structure looks something like this
```
/my/downloads
    /sonarr
    /radarr   
```

Now in your put.io account let's assume you have the following folder structure
```
/tv (id: 123)
/movies (id: 456)
```
Clicking on a folder in put.io will show you the folder id in the URL. For example, if you click on the `tv` folder
and the URL is `https://app.put.io/files/123` then the folder id is `123`.

So, let's set up the watchers
```dotenv
WATCHER_TARGETS=/my/downloads/sonarr:123;/my/downloads/radarr:456
```

#### Downloaders
Based on the structure mentioned above, you can set up the downloaders as follows
```dotenv
DOWNLOADERS=/my/downloads/sonarr:123;/my/downloads/radarr:456
```

It is up to you how you want to structure your folders. You could for example download 2 put.io folders in a single folder
on your local machine like this
```dotenv
DOWNLOADERS=/my/downloads:123;/my/downloads:456
```


# Development
This is a basic monorepo using npm workspaces. To execute namespace command use the following syntax
```shell
# Launch the backend in development mode
npm run backend

# Debug mode
npm run backend:debug
```

## Fullstack Development
Fullstack development environment with hot reload for both frontend and backend. The frontend is built using `react` with `vite` and the backend is built using `nestjs`.
To start the development environment for fullstack run the following commands.
```shell
# Launch backend
npm run backend

# Launch react
npm run client
```
Vite is proxying for the backend. It's all accessible on `http://localhost:4000`


## GraphQL Query
We are using 
- GraphQL Codegen (https://the-guild.dev/graphql/codegen/docs/guides/react-vue)
- Apollo Client (https://www.apollographql.com/docs/react/)
### Generate Types
```shell
# One time run
npm run codegen

# Watch mode
npm run codegen:watch
```

## Forms
We are using https://react-hook-form.com/ 

## Validation
We are using https://zod.dev/

## UI
We are using https://mui.com/ (material design)

## Routing
We are using https://reactrouter.com/en/main (react-router-dom)

## Charts
We are using https://nivo.rocks/


## Build and Run Docker
All environment variables with default values and extensive comments can be found in the `.env.example` file.

### Build and Run dev env.

Build and run on your laptop if you need to debug or test things with regard to the folders structure in
the docker environment.

```shell
# Build as purr
docker build -t purr .

# 
docker stop purr && docker rm purr && docker run -d -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/../purr.github.data:/downloads \
  --name purrito-container \
  purrito:latest
```

### Build for prod env.
This is the manual way of building it without using ci.

```shell
docker build --platform linux/amd64,linux/arm64 \
  -t ptheofan/purrito:1.0.1 \
  -t ptheofan/purrito:latest \
  --push .
```

### Docker Compose
Example docker-compose configuration. Ideally use some kind of reverse proxy in front of this service to provide
https and with a nice domain. Otherwise put the url you will need on the browser when calling it, such as `http://192.168.1.34:3000`

```yaml
services:
  purrito:
    image: ptheofan/purrito:1.0.1
    container_name: purrito
    hostname: purrito
    environment:
      - CONSOLE_LOG_LEVELS=log,error,warn,debug,verbose,fatal
      - PUID=1000
      - PGID=1000
      - HOST=http://localhost:3000
      - PUTIO_CLIENT_ID=
      - PUTIO_CLIENT_SECRET=
      - PUTIO_AUTH=
      - WATCHER_ENABLED=true
      - WATCHER_TARGETS=/downloads:xxx-putio-folder-id
      - DOWNLOADER_ENABLED=true
      - DOWNLOADER_TARGETS=/downloads:xxx-putio-folder-id
      - PUTIO_ENABLE_SOCKET=true
      - PUTIO_ENABLE_WEBHOOKS=false
      - PUTIO_CHECK_AT_STARTUP=true
      - UI_PROGRESS_UPDATE_INTERVAL=333
      - CONCURRENT_GROUPS=2
      - CONCURRENT_SMALL_FILES=8
      - CONCURRENT_LARGE_FILES=2
      - DOWNLOADER_CHUNK_SIZE=8388608
      - DOWNLOADER_PERFORMANCE_MONITORING_ENABLED=true
      - DOWNLOADER_PERFORMANCE_MONITORING_TIME=10
      - DOWNLOADER_PERFORMANCE_MONITORING_SPEED=
    volumes:
      - /my/downloads/path/on/host/machine:/downloads
    ports:
      - "3000:3000"
    restart: unless-stopped
```
