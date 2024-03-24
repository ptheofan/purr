#!/bin/sh

# Environment Variables
# UID - User ID
# GID - Group ID
# USER_NAME - User Name
# GROUP_NAME - Group Name

# if UID env is not set then set default value to 1000
if [ -z "$UID" ]; then
    UID=1000
    echo "UID not set, defaulting to $UID"
fi

# if GID env is not set then set default value to 1000
if [ -z "$GID" ]; then
    GID=1000
    echo "GID not set, defaulting to $GID"
fi

# if USER_NAME env is not set then set default value to node
if [ -z "$USER_NAME" ]; then
    USER_NAME=node
    echo "USER_NAME not set, defaulting to $USER_NAME"
fi

# if GROUP_NAME env is not set then set default value to node
if [ -z "$GROUP_NAME" ]; then
    GROUP_NAME=node
    echo "GROUP_NAME not set, defaulting to $GROUP_NAME"
fi

group=$(getent group ${GID} | cut -d: -f1)

if [ -z "$group" ]; then
    echo "Creating new group with GID: $GID"
    addgroup -g ${GID} --system ${GROUP_NAME}
else
    GROUP_NAME=$group
    echo "Using existing group: $GROUP_NAME"
fi

user=$(getent passwd ${UID} | cut -d: -f1)

if [ -z "$user" ]; then
    echo "Creating new user with UID: $UID"
    adduser --system --ingroup ${GROUP_NAME} --no-create-home --uid ${UID} --shell /bin/sh ${USER_NAME}
else
    USER_NAME=$user
    echo "Using existing user: $USER_NAME"
fi

# Execute the CMD from Dockerfile and capture its exit code
cd /app
node main
