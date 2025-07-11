# Backend Basic Folder Structure

**This application is responsible for the backend of the backend-basic-folder-structure app.**

## How to run the application

### Start the application

* npm start

---

## Docker Instructions

### Build the Docker Image

```sh
docker build -t bloom-payment-gateway-service .
```

### Save the Docker Image as a Tarball

```sh
docker save -o bloom-payment-gateway-service.tar bloom-payment-gateway-service
```

### Distribute the Tarball
You can now distribute the `bloom-payment-gateway-service.tar` file. To load it on another machine:

```sh
docker load -i bloom-payment-gateway-service.tar
```

### Run the Container

```sh
docker run -p 3000:3000 bloom-payment-gateway-service
```
