Feature: CRM REST API funtional tests

  Scenario: Get the root of the public API
    Given I am not authenticated
    When I send a "GET" request to "/" awaiting for "JSON"
    Then I get a response with status code 200
    And I get the current server version
    And I get the current server time

  Scenario: Get the /api route
    Given I am not authenticated
    When I send a "GET" request to "/api" awaiting for "JSON"
    Then I get a response with status code 401

  @cleanFsAfter
# TODO rewrite this scenario when file storage is good
#  Scenario: Get an existing file or asset
#    Given I am not authenticated
#    And There is a file named "testFile.txt" containing "some content"
#    When I send a "GET" request to "/fs/testFile.txt" awaiting for "a text file"
#    Then I get a response with status code 200
#    And The response content type is "text/plain; charset=UTF-8"
#    And I get "some content" as the response content

# TODO rewrite this scenario when file storage is good
#  Scenario: Get a missing file or asset
#    Given I am not authenticated
#    And The file named "testFile.txt" does not exist
#    When I send a "GET" request to "/fs/testFile.txt" awaiting for "a text file"
#    Then I get a response with status code 404
#    And The "JSON" response is
#      """
#      {
#        ok: false,
#        cause: "route",
#        rawResponse: "Error 404: Not found.",
#        readableresponse: "Nothing to see here..."
#      }
#      """

  Scenario: Access to auth routes with OPTIONS method
    Given I am not authenticated
    When I send an "OPTIONS" request to "/api/auth/login" awaiting for "confirmation that POST method is allowed"
    Then I get a response with status code 200
    And The response headers contain
      """
      { "content-security-policy":
         "default-src 'self'; style-src 'self' 'localhost:3000'; upgrade-insecure-requests",
        "x-content-security-policy":
         "default-src 'self'; style-src 'self' 'localhost:3000'; upgrade-insecure-requests",
        "x-webkit-csp":
         "default-src 'self'; style-src 'self' 'localhost:3000'; upgrade-insecure-requests",
        "x-dns-prefetch-control": "off",
        "strict-transport-security": "max-age=15552000; includeSubDomains",
        "x-download-options": "noopen",
        "x-content-type-options": "nosniff",
        "x-xss-protection": "1; mode=block",
        "access-control-allow-origin": "localhost:3000",
        "access-control-allow-credentials": "true",
        "access-control-allow-methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",
        "access-control-allow-headers":
         "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control",
      }
      """
    
  Scenario: Authenticate myself
    Given I am not authenticated
    When I authenticate myself as "thor@yggdrasil.com" with password "thor" which exist
    Then I get a response with status code 200
    And I get a bearer from the server
    And I get a user object with id "5c61894fd6b0362d7b5fbe8d" into "user"
    And A cookie named "Authorization" matching "Bearer%20[^;]*" has been set by the server

  Scenario: Authentication with bad credentials
    Given I am not authenticated
    When I authenticate myself as "idont@exist" with password "null" which does not exist
    Then I get a response with status code 403
    And I do not get a bearer from the server

  Scenario: /me route
    Given I am not authenticated
    When I authenticate myself as "thor@yggdrasil.com" with password "thor" which exist
    Then I am authenticated
    And I send a "GET" request to "/api/users/me" awaiting for "JSON"
    Then I get a response with status code 200
    And I get a user object with id "5c61894fd6b0362d7b5fbe8d" into "response"

  Scenario: Logout
    Given I am not authenticated
    When I authenticate myself as "thor@yggdrasil.com" with password "thor" which exist
    And I get a response with status code 200
    Then I send a "GET" request to "/api/auth/logout" awaiting for "JSON"
    And I get a response with status code 200
    When I send a "GET" request to "/api/users/me" awaiting for "JSON"
    Then I get a response with status code 401

  Scenario: Logout When not authenticated
    Given I am not authenticated
    When I send a "GET" request to "/api/logout" awaiting for "JSON"
    Then I get a response with status code 401

