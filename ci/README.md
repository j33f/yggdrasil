# Sending the pipeline to a concourse instance


1. login to Concourse

```
fly --target target_name login --team-name my-team \
    --concourse-url https://ci.example.com
```

See [the concourse documentation](https://concourse-ci.org/fly.html)

2. configure the credentials

* copy `credentials-sample.yml` to `credentials.yml`
* add a private key (preferably a Deployment Key for the repository) and a Github access token with access to the private repository and write access to the repository status.

3. run the command

(replacing "target_name" here with the target name defined in the login step)

```
./set-pipeline target_name
```
