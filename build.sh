#!/bin/bash
cd /home/galaxy/frontend
npm run build
cp /home/galaxy/frontend/public/member.html /home/galaxy/frontend/build/member.html
cp /home/galaxy/frontend/public/investor.html /home/galaxy/frontend/build/investor.html
echo "✅ Build selesai + member.html & investor.html ter-copy"
