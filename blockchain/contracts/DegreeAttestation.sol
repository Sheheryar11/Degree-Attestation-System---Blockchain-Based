// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DegreeAttestation
 * @notice On-chain registry for HEC-style degree attestation records.
 *         The backend service (owner) writes SHA-256 hashes of degree PDFs;
 *         anyone can verify a degree's authenticity without accessing PII.
 */
contract DegreeAttestation {
    address public owner;

    enum DegreeStatus { Active, Revoked }

    struct DegreeRecord {
        string  degreeHash;       // SHA-256 of the degree PDF (hex string)
        string  universityName;
        string  degreeName;
        string  graduationYear;
        string  attestationId;    // Internal application ID from backend
        uint256 timestamp;
        DegreeStatus status;
        bool    exists;
    }

    // degreeId (HEC-assigned string) => record
    mapping(string => DegreeRecord) private records;

    // degreeHash => degreeId for reverse lookup
    mapping(string => string) private hashToId;

    event DegreeRegistered(
        string indexed degreeId,
        string degreeHash,
        string universityName,
        string degreeName,
        string graduationYear,
        string attestationId,
        uint256 timestamp
    );

    event DegreeRevoked(
        string indexed degreeId,
        uint256 timestamp
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "DegreeAttestation: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ─── Owner functions ────────────────────────────────────────────────────

    /**
     * @notice Register a new attested degree on-chain.
     * @param degreeId       Unique HEC/application degree identifier
     * @param degreeHash     SHA-256 hash of the generated degree PDF
     * @param universityName Name of the issuing university
     * @param degreeName     Degree title (e.g. "Bachelor of Computer Science")
     * @param graduationYear Four-digit year string
     * @param attestationId  Internal application/attestation ID from backend
     */
    function registerDegree(
        string calldata degreeId,
        string calldata degreeHash,
        string calldata universityName,
        string calldata degreeName,
        string calldata graduationYear,
        string calldata attestationId
    ) external onlyOwner {
        require(bytes(degreeId).length > 0,       "DegreeAttestation: empty degreeId");
        require(bytes(degreeHash).length == 64,   "DegreeAttestation: invalid SHA-256 hash length");
        require(!records[degreeId].exists,        "DegreeAttestation: degree already registered");
        require(bytes(hashToId[degreeHash]).length == 0, "DegreeAttestation: hash already registered");

        records[degreeId] = DegreeRecord({
            degreeHash:     degreeHash,
            universityName: universityName,
            degreeName:     degreeName,
            graduationYear: graduationYear,
            attestationId:  attestationId,
            timestamp:      block.timestamp,
            status:         DegreeStatus.Active,
            exists:         true
        });

        hashToId[degreeHash] = degreeId;

        emit DegreeRegistered(
            degreeId,
            degreeHash,
            universityName,
            degreeName,
            graduationYear,
            attestationId,
            block.timestamp
        );
    }

    /**
     * @notice Revoke a previously registered degree.
     * @param degreeId Unique degree identifier to revoke
     */
    function revokeDegree(string calldata degreeId) external onlyOwner {
        require(records[degreeId].exists, "DegreeAttestation: degree not found");
        require(records[degreeId].status == DegreeStatus.Active, "DegreeAttestation: already revoked");

        records[degreeId].status = DegreeStatus.Revoked;

        emit DegreeRevoked(degreeId, block.timestamp);
    }

    /**
     * @notice Transfer contract ownership (e.g. to a multisig after go-live).
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "DegreeAttestation: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─── Public view functions ───────────────────────────────────────────────

    /**
     * @notice Verify a degree by its ID. Returns all public fields.
     */
    function verifyDegree(string calldata degreeId)
        external
        view
        returns (
            bool   isValid,
            bool   isRevoked,
            string memory degreeHash,
            string memory universityName,
            string memory degreeName,
            string memory graduationYear,
            string memory attestationId,
            uint256 timestamp
        )
    {
        DegreeRecord storage rec = records[degreeId];
        if (!rec.exists) {
            return (false, false, "", "", "", "", "", 0);
        }
        return (
            true,
            rec.status == DegreeStatus.Revoked,
            rec.degreeHash,
            rec.universityName,
            rec.degreeName,
            rec.graduationYear,
            rec.attestationId,
            rec.timestamp
        );
    }

    /**
     * @notice Look up a degree ID by its PDF hash.
     *         Useful for verifying an uploaded document without knowing the ID.
     */
    function getDegreeIdByHash(string calldata degreeHash)
        external
        view
        returns (string memory degreeId)
    {
        return hashToId[degreeHash];
    }

    /**
     * @notice Check whether a specific hash is registered and active.
     */
    function verifyHash(string calldata degreeHash)
        external
        view
        returns (bool isRegistered, bool isActive)
    {
        string memory id = hashToId[degreeHash];
        if (bytes(id).length == 0) return (false, false);
        DegreeRecord storage rec = records[id];
        return (true, rec.status == DegreeStatus.Active);
    }
}
