package com.kosaibari.repository;

import com.kosaibari.domain.District;
import com.kosaibari.domain.Thana;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class LocationRepository {

    private final JdbcTemplate jdbc;

    private static final RowMapper<District> DISTRICT_MAPPER = (rs, rowNum) -> {
        District d = new District();
        d.setId(rs.getInt("id"));
        d.setNameBn(rs.getString("name_bn"));
        d.setNameEn(rs.getString("name_en"));
        d.setActive(rs.getBoolean("is_active"));
        d.setCreatedAt(rs.getTimestamp("created_at").toInstant());
        return d;
    };

    private static final RowMapper<Thana> THANA_MAPPER = (rs, rowNum) -> {
        Thana t = new Thana();
        t.setId(rs.getInt("id"));
        t.setDistrictId(rs.getInt("district_id"));
        t.setNameBn(rs.getString("name_bn"));
        t.setNameEn(rs.getString("name_en"));
        t.setActive(rs.getBoolean("is_active"));
        t.setCreatedAt(rs.getTimestamp("created_at").toInstant());
        return t;
    };

    public List<District> findAllDistricts() {
        return jdbc.query(
            "SELECT * FROM districts WHERE is_active = true ORDER BY name_en",
            DISTRICT_MAPPER
        );
    }

    public Optional<District> findDistrictById(int id) {
        var list = jdbc.query(
            "SELECT * FROM districts WHERE id = ?",
            DISTRICT_MAPPER, id
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public District createDistrict(String nameBn, String nameEn) {
        jdbc.update(
            "INSERT INTO districts (name_bn, name_en) VALUES (?, ?)",
            nameBn, nameEn
        );
        int id = jdbc.queryForObject("SELECT lastval()", Integer.class);
        return findDistrictById(id).orElseThrow();
    }

    public List<Thana> findThanasByDistrict(int districtId) {
        return jdbc.query(
            "SELECT * FROM thanas WHERE district_id = ? AND is_active = true ORDER BY name_en",
            THANA_MAPPER, districtId
        );
    }

    public List<Thana> findAllThanas() {
        return jdbc.query(
            "SELECT * FROM thanas WHERE is_active = true ORDER BY district_id, name_en",
            THANA_MAPPER
        );
    }

    public Optional<Thana> findThanaById(int id) {
        var list = jdbc.query(
            "SELECT * FROM thanas WHERE id = ?",
            THANA_MAPPER, id
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Thana createThana(int districtId, String nameBn, String nameEn) {
        jdbc.update(
            "INSERT INTO thanas (district_id, name_bn, name_en) VALUES (?, ?, ?)",
            districtId, nameBn, nameEn
        );
        int id = jdbc.queryForObject("SELECT lastval()", Integer.class);
        return findThanaById(id).orElseThrow();
    }
}
