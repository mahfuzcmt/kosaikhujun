package com.kosaibari.repository;

import com.kosaibari.domain.AppSettings;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AppSettingsRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<AppSettings> rowMapper = (rs, rowNum) -> {
        AppSettings s = new AppSettings();
        s.setId(rs.getInt("id"));
        s.setSettingKey(rs.getString("setting_key"));
        s.setSettingValue(rs.getString("setting_value"));
        s.setDescription(rs.getString("description"));
        s.setCreatedAt(rs.getTimestamp("created_at").toInstant());
        s.setUpdatedAt(rs.getTimestamp("updated_at").toInstant());
        return s;
    };

    public Optional<AppSettings> findByKey(String key) {
        var list = jdbc.query(
            "SELECT * FROM app_settings WHERE setting_key = ?",
            rowMapper,
            key
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public String getValue(String key, String defaultValue) {
        return findByKey(key)
            .map(AppSettings::getSettingValue)
            .orElse(defaultValue);
    }

    public boolean getBooleanValue(String key, boolean defaultValue) {
        String value = getValue(key, String.valueOf(defaultValue));
        return "true".equalsIgnoreCase(value) || "1".equals(value) || "yes".equalsIgnoreCase(value);
    }

    public List<AppSettings> findAll() {
        return jdbc.query("SELECT * FROM app_settings ORDER BY setting_key", rowMapper);
    }

    public List<AppSettings> findByKeyPrefix(String prefix) {
        return jdbc.query(
            "SELECT * FROM app_settings WHERE setting_key LIKE ? ORDER BY setting_key",
            rowMapper,
            prefix + "%"
        );
    }

    public void update(String key, String value) {
        jdbc.update(
            "UPDATE app_settings SET setting_value = ?, updated_at = now() WHERE setting_key = ?",
            value, key
        );
    }

    public void upsert(String key, String value, String description) {
        jdbc.update("""
            INSERT INTO app_settings (setting_key, setting_value, description)
            VALUES (?, ?, ?)
            ON CONFLICT (setting_key) DO UPDATE SET
                setting_value = EXCLUDED.setting_value,
                updated_at = now()
            """,
            key, value, description
        );
    }
}
