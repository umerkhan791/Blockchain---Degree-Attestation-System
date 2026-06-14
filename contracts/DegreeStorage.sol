// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DegreeStorage {

    struct Degree {
        string studentName;
        string degreeHash;
        uint256 timestamp;
        bool revoked;
        bool exists;
    }

    mapping(string => Degree) public degrees;

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Not authorized"
        );
        _;
    }

    // Only university/admin can issue degrees
    function storeDegree(
        string memory _studentName,
        string memory _degreeHash
    ) public onlyOwner {

        require(
            !degrees[_degreeHash].exists,
            "Degree already issued"
        );

        degrees[_degreeHash] = Degree(
            _studentName,
            _degreeHash,
            block.timestamp,
            false, // revoked
            true   // exists
        );
    }

    function verifyDegree(
        string memory _degreeHash
    )
        public
        view
        returns (
            string memory studentName,
            uint256 timestamp,
            bool revoked
        )
    {
        require(
            degrees[_degreeHash].exists,
            "Degree does not exist"
        );

        Degree memory d =
            degrees[_degreeHash];

        return (
            d.studentName,
            d.timestamp,
            d.revoked
        );
    }

    // University/Admin can revoke degrees
    function revokeDegree(
        string memory _degreeHash
    ) public onlyOwner {

        require(
            degrees[_degreeHash].exists,
            "Degree does not exist"
        );

        require(
            !degrees[_degreeHash].revoked,
            "Degree already revoked"
        );

        degrees[_degreeHash].revoked = true;
    }

    // Helper function
    function isRevoked(
        string memory _degreeHash
    )
        public
        view
        returns (bool)
    {
        require(
            degrees[_degreeHash].exists,
            "Degree does not exist"
        );

        return
            degrees[_degreeHash]
                .revoked;
    }
}