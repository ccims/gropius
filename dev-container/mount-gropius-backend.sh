#!/bin/bash
mkdir -p /tmp/overlay
mount -t tmpfs tmpfs /tmp/overlay
mkdir -p /tmp/overlay/{upper,work}
mkdir -p /root/gropius-backend-workdir
mount -t overlay overlay -o lowerdir=/root/gropius-backend,upperdir=/tmp/overlay/upper,workdir=/tmp/overlay/work /root/gropius-backend-workdir