Feature: SocketIO API

#  @ioDisconnectAfter
#  Scenario: Login then emit a SocketIO call
#    Given I am not authenticated
#    Then I authenticate myself as "thor@yggdrasil.com" with password "thor" which exist
#    When I emit the "users/me" event with no data
#    Then I receive a document corresponding to the fixture located in "testing_users.data" with id "5c61894fd6b0362d7b5fbe8d"
#
#  @ioDisconnectAfter
#  Scenario: Emit a SocketIO call without a valid JWT
#    Given I am not authenticated
#    When I emit the "users/me" event with no data
#    Then I receive a JWT error as a response