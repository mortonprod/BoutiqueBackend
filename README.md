# Boutique Backend

##Docker

docker build -t mortonprod/boutique:latest  .

Then to run the container

docker run -p 4000:3001 -m "300M" --memory-swap "1G" --name boutique -d  --init mortonprod/boutique

Connect to docker hub and then push:

docker login
docker push

##Connecting to digital ocean 

This is a quick introduction to connecting to digital ocean. Useful if you are using this for hosting. 
Remember there is a password for the digital ocean account and one for the droplet you are attached to.
