#!/bin/bash
cd dist/vhonitbe/browser
rsync -avz --delete ./ avocado@vhonitbe.cloud:/var/www/vhonitbe/