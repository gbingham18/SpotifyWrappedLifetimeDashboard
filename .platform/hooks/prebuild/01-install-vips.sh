#!/bin/bash

set -xe

# Install libvips and its development headers
dnf install -y libvips libvips-devel
