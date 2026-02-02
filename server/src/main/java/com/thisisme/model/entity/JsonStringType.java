package com.thisisme.model.entity;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.usertype.UserType;

import java.io.Serializable;
import java.sql.*;
import java.util.Objects;

/**
 * Hibernate UserType that maps a Java String to a PostgreSQL JSONB column.
 * Uses setObject with Types.OTHER so the PG JDBC driver handles the implicit
 * cast to jsonb, avoiding the VARCHAR vs JSONB type mismatch.
 */
public class JsonStringType implements UserType<String> {

    @Override
    public Class<String> returnedClass() {
        return String.class;
    }

    @Override
    public int getSqlType() {
        return Types.OTHER;
    }

    @Override
    public String nullSafeGet(ResultSet rs, int columnIndex,
                              SharedSessionContractImplementor session, Object owner) throws SQLException {
        return rs.getString(columnIndex);
    }

    @Override
    public void nullSafeSet(PreparedStatement st, String value, int index,
                            SharedSessionContractImplementor session) throws SQLException {
        if (value == null) {
            st.setNull(index, Types.OTHER);
        } else {
            st.setObject(index, value, Types.OTHER);
        }
    }

    @Override
    public boolean equals(String x, String y) {
        return Objects.equals(x, y);
    }

    @Override
    public int hashCode(String x) {
        return Objects.hashCode(x);
    }

    @Override
    public String deepCopy(String value) {
        return value;
    }

    @Override
    public boolean isMutable() {
        return false;
    }

    @Override
    public Serializable disassemble(String value) {
        return value;
    }

    @Override
    public String assemble(Serializable cached, Object owner) {
        return (String) cached;
    }
}
